const symbols={THB:'฿',USD:'$',EUR:'€',GBP:'£',SGD:'S$',KHR:'៛',JPY:'¥'};
const cfg=window.MEDCABINET_CONFIG;
const apiUrl=`${cfg.supabaseUrl}/rest/v1/medicines`;
const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`,'Content-Type':'application/json'};
const $=id=>document.getElementById(id);
const toast=document.createElement('div');toast.className='toast';document.body.appendChild(toast);
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2500)}
function setGreeting(){const h=new Date().getHours();document.querySelector('.topbar .eyebrow').textContent=h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function currentCurrency(){return localStorage.getItem('medcabinet_currency')||'THB'}
function applyCurrency(code){const s=symbols[code]||code+' ';$('currencyBtn').textContent=s;$('formCurrencyLabel').textContent=`Prices saved in ${code}`;localStorage.setItem('medcabinet_currency',code)}
function openAdd(){if($('scanDialog').open)$('scanDialog').close();$('addMedicineDialog').showModal();setTimeout(()=>$('brandName').focus(),100)}
function closeDialog(id){const d=$(id);if(d?.open)d.close()}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function expiryStatus(date){if(!date)return'';const days=Math.ceil((new Date(date+'T00:00:00')-new Date())/86400000);if(days<0)return'Expired';if(days<=90)return'Expires soon';return''}
async function loadMedicines(){
 try{
  const r=await fetch(`${apiUrl}?select=*&order=created_at.desc&limit=20`,{headers});
  if(!r.ok)throw new Error((await r.json()).message||`Load failed (${r.status})`);
  const items=await r.json();
  $('totalMedicines').textContent=items.length;
  const today=new Date();let expired=0,soon=0,low=0,total=0;
  items.forEach(m=>{if(m.expiry_date){const d=(new Date(m.expiry_date+'T00:00:00')-today)/86400000;if(d<0)expired++;else if(d<=90)soon++;}if((m.quantity||0)<=5)low++;total+=Number(m.purchase_price||0)});
  $('expiredCount').textContent=expired;$('expiringSoon').textContent=soon;$('lowStock').textContent=low;
  const code=currentCurrency(),sym=symbols[code]||code+' ';$('monthlySpend').textContent=`${sym}${total.toLocaleString()}`;$('reportValue').textContent=`${sym}${total.toLocaleString()}`;
  $('reportMedicineCount').textContent=items.length;$('reportExpiredCount').textContent=expired;$('reportExpiringCount').textContent=soon;
  $('medicineList').innerHTML=items.length?items.map(m=>`<div class="medicine-row"><div class="medicine-thumb">${esc((m.brand_name||'?')[0].toUpperCase())}</div><div><strong>${esc(m.brand_name||'Unnamed medicine')} ${esc(m.strength||'')}</strong><small>${esc(m.category||m.dosage_form||'Medicine')} · ${m.expiry_date?'Expires '+esc(m.expiry_date):'No expiry date'}</small></div><span class="status ${expiryStatus(m.expiry_date)==='Expired'?'amber-status':'green-status'}">${expiryStatus(m.expiry_date)||esc((m.quantity||0)+' in stock')}</span></div>`).join(''):'<p class="empty-state">No medicines added yet. Tap <strong>Add medicine</strong> to create your first record.</p>';
 }catch(e){console.error(e);showToast(e.message)}
}
async function saveMedicine(e){
 e.preventDefault();
 const btn=$('saveMedicineBtn');btn.disabled=true;btn.textContent='Saving…';
 const location=$('storageLocation').value.trim();const notes=$('notes').value.trim();
 const payload={brand_name:$('brandName').value.trim(),strength:$('strength').value.trim()||null,dosage_form:$('dosageForm').value||null,quantity:Number($('quantity').value||0),expiry_date:$('expiryDate').value||null,category:$('category').value||null,purchase_price:$('purchasePrice').value?Number($('purchasePrice').value):null,currency:currentCurrency(),purchase_store:$('purchaseStore').value.trim()||null,barcode:$('barcode').value.trim()||null,notes:[notes,location?`Location: ${location}`:''].filter(Boolean).join('\n')||null};
 try{
  const r=await fetch(apiUrl,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!r.ok){const x=await r.json().catch(()=>({}));throw new Error(x.message||x.hint||`Save failed (${r.status})`)}
  $('medicineForm').reset();$('quantity').value=1;closeDialog('addMedicineDialog');showToast('Medicine saved');await loadMedicines();
 }catch(e){console.error(e);showToast(e.message)}finally{btn.disabled=false;btn.textContent='Save medicine'}
}
setGreeting();const saved=currentCurrency();$('currencySelect').value=saved;applyCurrency(saved);
$('currencyBtn').addEventListener('click',()=>$('currencyDialog').showModal());
$('saveCurrencyBtn').addEventListener('click',()=>{applyCurrency($('currencySelect').value);showToast('Currency updated');loadMedicines()});
$('mainScanBtn').addEventListener('click',()=>$('scanDialog').showModal());
document.querySelector('[data-action="add"]').addEventListener('click',openAdd);
document.querySelector('[data-scan-action="add"]').addEventListener('click',openAdd);
document.querySelectorAll('[data-action]:not([data-action="add"])').forEach(b=>b.addEventListener('click',()=>$('scanDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));
$('medicineForm').addEventListener('submit',saveMedicine);$('refreshBtn').addEventListener('click',loadMedicines);
$('shareReportBtn').addEventListener('click',()=>$('reportDialog').showModal());
$('nativeShareBtn').addEventListener('click',async()=>{const text=`My MedCabinet AI score is ${$('scoreValue').textContent}/100.`;try{if(navigator.share)await navigator.share({title:'My MedCabinet AI Report',text});else{await navigator.clipboard.writeText(text);showToast('Report copied')}}catch(e){if(e.name!=='AbortError')showToast('Sharing unavailable')}});
loadMedicines();