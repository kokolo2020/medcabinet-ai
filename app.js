const symbols={THB:'฿',USD:'$',EUR:'€',GBP:'£',SGD:'S$',KHR:'៛',JPY:'¥'};
const cfg=window.MEDCABINET_CONFIG;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
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

let pendingPhotoFile=null;
let scanInProgress=false;

function resetPhotoPreview(){pendingPhotoFile=null;$('photoPreviewWrap').hidden=true;$('photoPreview').src='';$('scanPhotoOptions').hidden=false}
function showPhotoPreview(dataUrl){$('photoPreview').src=dataUrl;$('photoPreviewWrap').hidden=false;$('scanPhotoOptions').hidden=true}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}

function fillFormFromScan(d={}){
 $('brandName').value=d.brand_name||'';
 $('manufacturer').value=d.manufacturer||'';
 $('strength').value=d.strength||'';
 if(d.dosage_form&&[...$('dosageForm').options].some(o=>o.value===d.dosage_form))$('dosageForm').value=d.dosage_form;
 if(d.category&&[...$('category').options].some(o=>o.value===d.category))$('category').value=d.category;
 $('expiryDate').value=d.expiry_date||'';
 $('barcode').value=d.barcode||'';
}

async function handlePhotoSelected(e){
 const file=e.target.files[0];
 e.target.value='';
 if(!file||scanInProgress)return;
 scanInProgress=true;
 pendingPhotoFile=file;
 showToast('Scanning photo…');
 try{
  const dataUrl=await fileToDataUrl(file);
  const base64=dataUrl.split(',')[1];
  const r=await fetch('/.netlify/functions/scan-medicine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mediaType:file.type||'image/jpeg'})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||`Scan failed (${r.status})`);
  openAdd();
  fillFormFromScan(data);
  showPhotoPreview(dataUrl);
  showToast('Scanned — check the details and save');
 }catch(err){
  console.error(err);
  pendingPhotoFile=file;
  openAdd();
  try{showPhotoPreview(await fileToDataUrl(file))}catch{}
  showToast(err.message||'Could not auto-scan, fill in manually');
 }finally{scanInProgress=false}
}

async function uploadPhoto(file){
 const path=`${crypto.randomUUID()}-${(file.name||'photo.jpg').replace(/[^a-zA-Z0-9.]/g,'_')}`;
 const {error}=await sb.storage.from('medicine-photos').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});
 if(error)throw new Error(error.message||'Photo upload failed');
 const {data}=sb.storage.from('medicine-photos').getPublicUrl(path);
 return data.publicUrl;
}

async function loadMedicines(){
 try{
  const {data:items,error}=await sb.from('medicines').select('*').order('created_at',{ascending:false}).limit(20);
  if(error)throw new Error(error.message||'Load failed');
  $('totalMedicines').textContent=items.length;
  const today=new Date();let expired=0,soon=0,low=0,total=0;
  items.forEach(m=>{if(m.expiry_date){const d=(new Date(m.expiry_date+'T00:00:00')-today)/86400000;if(d<0)expired++;else if(d<=90)soon++;}if((m.quantity||0)<=5)low++;total+=Number(m.purchase_price||0)});
  $('expiredCount').textContent=expired;$('expiringSoon').textContent=soon;$('lowStock').textContent=low;
  const code=currentCurrency(),sym=symbols[code]||code+' ';$('monthlySpend').textContent=`${sym}${total.toLocaleString()}`;$('reportValue').textContent=`${sym}${total.toLocaleString()}`;
  $('reportMedicineCount').textContent=items.length;$('reportExpiredCount').textContent=expired;$('reportExpiringCount').textContent=soon;
  $('medicineList').innerHTML=items.length?items.map(m=>{
   const thumb=m.photo_url?`<img class="medicine-thumb-img" src="${esc(m.photo_url)}" alt="${esc(m.brand_name||'')}">`:`<div class="medicine-thumb">${esc((m.brand_name||'?')[0].toUpperCase())}</div>`;
   return `<div class="medicine-row" data-id="${esc(m.id)}">${thumb}<div><strong>${esc(m.brand_name||'Unnamed medicine')} ${esc(m.strength||'')}</strong><small>${esc(m.category||m.dosage_form||'Medicine')} · ${m.expiry_date?'Expires '+esc(m.expiry_date):'No expiry date'}</small></div><span class="status ${expiryStatus(m.expiry_date)==='Expired'?'amber-status':'green-status'}">${expiryStatus(m.expiry_date)||esc((m.quantity||0)+' in stock')}</span><button type="button" class="delete-btn" data-delete-id="${esc(m.id)}" aria-label="Delete ${esc(m.brand_name||'medicine')}">🗑</button></div>`;
  }).join(''):'<p class="empty-state">No medicines added yet. Tap <strong>Add medicine</strong> to create your first record.</p>';
 }catch(e){console.error(e);showToast(e.message)}
}

async function deleteMedicine(id){
 if(!confirm('Delete this medicine?'))return;
 try{
  const {error}=await sb.from('medicines').delete().eq('id',id);
  if(error)throw new Error(error.message||'Delete failed');
  showToast('Medicine deleted');
  await loadMedicines();
 }catch(e){console.error(e);showToast(e.message)}
}

async function saveMedicine(e){
 e.preventDefault();
 const btn=$('saveMedicineBtn');btn.disabled=true;btn.textContent='Saving…';
 const location=$('storageLocation').value.trim();const notes=$('notes').value.trim();
 try{
  let photo_url=null;
  if(pendingPhotoFile){btn.textContent='Uploading photo…';photo_url=await uploadPhoto(pendingPhotoFile)}
  const boxes=Number($('boxes').value||0),qtyPerBox=Number($('qtyPerBox').value||0);
  const payload={brand_name:$('brandName').value.trim(),manufacturer:$('manufacturer').value.trim()||null,strength:$('strength').value.trim()||null,dosage_form:$('dosageForm').value||null,quantity:boxes*qtyPerBox,expiry_date:$('expiryDate').value||null,category:$('category').value||null,purchase_price:$('purchasePrice').value?Number($('purchasePrice').value):null,currency:currentCurrency(),purchase_store:$('purchaseStore').value.trim()||null,barcode:$('barcode').value.trim()||null,photo_url,notes:[notes,location?`Location: ${location}`:''].filter(Boolean).join('\n')||null};
  btn.textContent='Saving…';
  const {error}=await sb.from('medicines').insert(payload);
  if(error)throw new Error(error.message||error.hint||'Save failed');
  $('medicineForm').reset();$('boxes').value=1;$('qtyPerBox').value=1;resetPhotoPreview();closeDialog('addMedicineDialog');showToast('Medicine saved');await loadMedicines();
 }catch(e){console.error('SAVE ERROR:',e);showToast(e.message||'Save failed');alert('Save failed:\n\n'+(e&&e.message?e.message:JSON.stringify(e)))}finally{btn.disabled=false;btn.textContent='Save medicine'}
}

setGreeting();const saved=currentCurrency();$('currencySelect').value=saved;applyCurrency(saved);
$('currencyBtn').addEventListener('click',()=>$('currencyDialog').showModal());
$('saveCurrencyBtn').addEventListener('click',()=>{applyCurrency($('currencySelect').value);showToast('Currency updated');loadMedicines()});
$('mainScanBtn').addEventListener('click',()=>$('scanDialog').showModal());
document.querySelector('[data-action="add"]').addEventListener('click',()=>{$('medicineForm').reset();resetPhotoPreview();openAdd()});
document.querySelector('[data-scan-action="add"]').addEventListener('click',()=>$('photoInputCamera').click());
document.querySelectorAll('[data-action]:not([data-action="add"])').forEach(b=>b.addEventListener('click',()=>$('scanDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{closeDialog(b.dataset.close);if(b.dataset.close==='addMedicineDialog'){$('medicineForm').reset();resetPhotoPreview()}}));
$('photoInputCamera').addEventListener('change',handlePhotoSelected);
$('photoInputGallery').addEventListener('change',handlePhotoSelected);
$('takePhotoBtn').addEventListener('click',()=>$('photoInputCamera').click());
$('uploadPhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('retakePhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('medicineForm').addEventListener('submit',saveMedicine);$('refreshBtn').addEventListener('click',loadMedicines);
$('medicineList').addEventListener('click',e=>{const b=e.target.closest('[data-delete-id]');if(b)deleteMedicine(b.dataset.deleteId)});
$('shareReportBtn').addEventListener('click',()=>$('reportDialog').showModal());
$('nativeShareBtn').addEventListener('click',async()=>{const text=`My MedCabinet AI score is ${$('scoreValue').textContent}/100.`;try{if(navigator.share)await navigator.share({title:'My MedCabinet AI Report',text});else{await navigator.clipboard.writeText(text);showToast('Report copied')}}catch(e){if(e.name!=='AbortError')showToast('Sharing unavailable')}});
loadMedicines();
