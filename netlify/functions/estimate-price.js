// Estimates a rough retail price for a medicine using Claude's general
// knowledge — NOT live pricing. Used as a fallback when the person leaves
// the purchase price blank. Requires ANTHROPIC_API_KEY in Netlify env vars.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { brand_name, generic_name, strength, dosage_form, manufacturer, quantity, currency } = body;
  if (!brand_name) {
    return { statusCode: 400, body: JSON.stringify({ error: 'brand_name is required' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('estimate-price: ANTHROPIC_API_KEY is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Netlify' }) };
  }

  const prompt = `Estimate a reasonable retail purchase price for this medicine, in ${currency || 'THB'}, based on your general knowledge of typical pharmacy prices. This is a rough estimate only, not live pricing — you have no internet access here.
Medicine: ${brand_name}${generic_name ? ` (${generic_name})` : ''}
Strength: ${strength || 'unknown'}
Form: ${dosage_form || 'unknown'}
Manufacturer: ${manufacturer || 'unknown'}
Quantity in this purchase: ${quantity || 'unknown'}

Respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{"estimated_price": number or null, "confidence": "low" or "medium" or "high"}
If you don't have enough information to make even a rough guess, use null for estimated_price and "low" for confidence.`;

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('estimate-price: Claude API error', resp.status, JSON.stringify(data));
      return { statusCode: resp.status, body: JSON.stringify({ error: data.error?.message || `Claude API error (${resp.status})` }) };
    }

    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('estimate-price: could not parse Claude response', text);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not parse estimate' }) };
    }

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('estimate-price: unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Estimate failed' }) };
  }
};
