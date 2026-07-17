// Scans a photo of a medicine package with Claude Vision and returns
// structured fields to auto-fill the "Add medicine" form.
// Requires ANTHROPIC_API_KEY to be set in Netlify's environment variables.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let image, mediaType;
  try {
    ({ image, mediaType } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!image) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('scan-medicine: ANTHROPIC_API_KEY is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Netlify' }) };
  }
  if (typeof fetch !== 'function') {
    console.error('scan-medicine: global fetch is unavailable — check Node version (needs 18+)');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server runtime misconfigured (no fetch) — check Netlify Node version' }) };
  }

  const prompt = `You are looking at a photo of a medicine package, box, blister strip, or bottle.
Extract what you can actually read and respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{"brand_name": string or null, "generic_name": string or null, "strength": string or null, "dosage_form": one of "Tablet","Capsule","Syrup","Cream","Drops","Injection","Other" or null, "category": one of "Pain relief","Cold & flu","Allergy","Antibiotic","Anti-seizure","Digestive","Vitamins & supplements","First aid","Other" or null, "expiry_date": "YYYY-MM-DD" or null, "barcode": string or null, "manufacturer": string or null}
Never guess a value you can't actually read on the packaging — use null instead.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('scan-medicine: Claude API error', resp.status, JSON.stringify(data));
      return { statusCode: resp.status, body: JSON.stringify({ error: data.error?.message || `Claude API error (${resp.status})` }) };
    }

    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('scan-medicine: could not parse Claude response', text);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not parse scan result' }) };
    }

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('scan-medicine: unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Scan failed' }) };
  }
};
