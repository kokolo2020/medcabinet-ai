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

function estimateRunOutDate(m){
 if(m.is_storage_only||!m.dosage_amount||!m.dosage_frequency||!m.quantity)return null;
 const perDay=m.dosage_frequency==='day'?m.dosage_amount:m.dosage_frequency==='week'?m.dosage_amount/7:m.dosage_amount/30;
 if(!perDay)return null;
 const days=Math.ceil(m.quantity/perDay);
 const d=new Date();d.setDate(d.getDate()+days);
 return d.toISOString().slice(0,10);
}

let pendingPhotoFile=null;
let scanInProgress=false;
let expiredItems=[];
let currentItems=[];
let favoriteRows=[];

function favoriteMedicineIds(){return new Set(favoriteRows.filter(f=>f.medicine_id).map(f=>f.medicine_id))}

function medicineRowHtml(m,favIds){
 const thumb=m.photo_url?`<img class="medicine-thumb-img" src="${esc(m.photo_url)}" alt="${esc(m.brand_name||'')}">`:`<div class="medicine-thumb">${esc((m.brand_name||'?')[0].toUpperCase())}</div>`;
 const isFav=favIds.has(m.id);
 const runOut=estimateRunOutDate(m);
 const subtext=[esc(m.category||m.dosage_form||'Medicine'),m.expiry_date?'Expires '+esc(m.expiry_date):'No expiry date',runOut?'~runs out '+esc(runOut):''].filter(Boolean).join(' · ');
 return `<div class="medicine-row" data-id="${esc(m.id)}">${thumb}<div><strong>${esc(m.brand_name||'Unnamed medicine')} ${esc(m.strength||'')}</strong><small>${subtext}</small></div><span class="status ${expiryStatus(m.expiry_date)==='Expired'?'amber-status':'green-status'}">${expiryStatus(m.expiry_date)||esc((m.quantity||0)+' in stock')}</span><button type="button" class="fav-btn ${isFav?'is-fav':''}" data-fav-toggle="${esc(m.id)}" aria-label="Favorite">${isFav?'★':'☆'}</button><button type="button" class="delete-btn" data-delete-id="${esc(m.id)}" aria-label="Delete ${esc(m.brand_name||'medicine')}">🗑</button></div>`;
}

function renderMedicineList(){
 const favIds=favoriteMedicineIds();
 $('medicineList').innerHTML=currentItems.length?currentItems.map(m=>medicineRowHtml(m,favIds)).join(''):'<p class="empty-state">No medicines added yet. Tap <strong>Add medicine</strong> to create your first record.</p>';
}

function renderExpiredList(){
 const favIds=favoriteMedicineIds();
 $('expiredList').innerHTML=expiredItems.length?expiredItems.map(m=>medicineRowHtml(m,favIds)).join(''):'<p class="empty-state">Nothing expired. Nice.</p>';
}

function renderFavoritesList(){
 $('favoritesList').innerHTML=favoriteRows.length?favoriteRows.map(f=>{
  const thumb=f.photo_url?`<img class="medicine-thumb-img" src="${esc(f.photo_url)}" alt="${esc(f.brand_name||'')}">`:`<div class="medicine-thumb">${esc((f.brand_name||'?')[0].toUpperCase())}</div>`;
  return `<div class="medicine-row" data-id="${esc(f.id)}">${thumb}<div><strong>${esc(f.brand_name||'Unnamed medicine')} ${esc(f.strength||'')}</strong><small>${esc(f.category||f.dosage_form||'Medicine')}</small></div><span></span><button type="button" class="delete-btn" data-unfav-id="${esc(f.id)}" aria-label="Remove ${esc(f.brand_name||'medicine')} from favorites">🗑</button></div>`;
 }).join(''):'<p class="empty-state">No favorites yet. Tap the star on any medicine to save it here.</p>';
}

async function loadFavorites(){
 const {data,error}=await sb.from('favorites').select('*').order('created_at',{ascending:false});
 if(error){console.error(error);return}
 favoriteRows=data||[];
}

async function toggleFavorite(medicineId){
 try{
  const existing=favoriteRows.find(f=>f.medicine_id===medicineId);
  if(existing){
   const {error}=await sb.from('favorites').delete().eq('id',existing.id);
   if(error)throw new Error(error.message||'Could not remove favorite');
   showToast('Removed from favorites');
  }else{
   const m=currentItems.find(i=>i.id===medicineId)||expiredItems.find(i=>i.id===medicineId);
   if(!m)return;
   const {error}=await sb.from('favorites').insert({medicine_id:m.id,brand_name:m.brand_name,manufacturer:m.manufacturer,strength:m.strength,dosage_form:m.dosage_form,category:m.category,photo_url:m.photo_url,notes:m.notes});
   if(error)throw new Error(error.message||'Could not add favorite');
   showToast('Added to favorites');
  }
  await loadFavorites();
  renderMedicineList();
  if($('expiredDialog').open)renderExpiredList();
  if($('favoritesDialog').open)renderFavoritesList();
 }catch(e){console.error(e);showToast(e.message)}
}

async function removeFavorite(favId){
 try{
  const {error}=await sb.from('favorites').delete().eq('id',favId);
  if(error)throw new Error(error.message||'Could not remove favorite');
  await loadFavorites();
  renderFavoritesList();
  renderMedicineList();
  if($('expiredDialog').open)renderExpiredList();
 }catch(e){console.error(e);showToast(e.message)}
}

function resetPhotoPreview(){pendingPhotoFile=null;$('photoPreviewWrap').hidden=true;$('photoPreview').src='';$('scanPhotoOptions').hidden=false}
function showPhotoPreview(dataUrl){$('photoPreview').src=dataUrl;$('photoPreviewWrap').hidden=false;$('scanPhotoOptions').hidden=true}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function toggleDosageFields(){const on=!$('storageOnly').checked;$('dosageAmountLabel').hidden=!on;$('dosageFrequencyLabel').hidden=!on}

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
  currentItems=items;
  await loadFavorites();
  $('totalMedicines').textContent=items.length;
  const today=new Date();let expired=0,soon=0,low=0,total=0;
  expiredItems=[];
  items.forEach(m=>{if(m.expiry_date){const d=(new Date(m.expiry_date+'T00:00:00')-today)/86400000;if(d<0){expired++;expiredItems.push(m)}else if(d<=90)soon++;}if((m.quantity||0)<=5)low++;total+=Number(m.purchase_price||0)});
  $('expiredCount').textContent=expired;$('expiringSoon').textContent=soon;$('lowStock').textContent=low;
  const code=currentCurrency(),sym=symbols[code]||code+' ';$('reportValue').textContent=`${sym}${total.toLocaleString()}`;
  $('reportMedicineCount').textContent=items.length;$('reportExpiredCount').textContent=expired;$('reportExpiringCount').textContent=soon;
  renderMedicineList();
  if($('expiredDialog').open)renderExpiredList();
  if($('favoritesDialog').open)renderFavoritesList();
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
  const isStorageOnly=$('storageOnly').checked;
  const payload={brand_name:$('brandName').value.trim(),manufacturer:$('manufacturer').value.trim()||null,strength:$('strength').value.trim()||null,dosage_form:$('dosageForm').value||null,quantity:boxes*qtyPerBox,is_storage_only:isStorageOnly,dosage_amount:isStorageOnly?null:($('dosageAmount').value?Number($('dosageAmount').value):null),dosage_frequency:isStorageOnly?null:$('dosageFrequency').value,expiry_date:$('expiryDate').value||null,category:$('category').value||null,purchase_price:$('purchasePrice').value?Number($('purchasePrice').value):null,currency:currentCurrency(),purchase_store:$('purchaseStore').value.trim()||null,barcode:$('barcode').value.trim()||null,photo_url,notes:[notes,location?`Location: ${location}`:''].filter(Boolean).join('\n')||null};
  btn.textContent='Saving…';
  const {error}=await sb.from('medicines').insert(payload);
  if(error)throw new Error(error.message||error.hint||'Save failed');
  $('medicineForm').reset();$('boxes').value=1;$('qtyPerBox').value=1;resetPhotoPreview();toggleDosageFields();closeDialog('addMedicineDialog');showToast('Medicine saved');await loadMedicines();
 }catch(e){console.error(e);showToast(e.message||'Save failed')}finally{btn.disabled=false;btn.textContent='Save medicine'}
}

setGreeting();const saved=currentCurrency();$('currencySelect').value=saved;applyCurrency(saved);
$('currencyBtn').addEventListener('click',()=>$('currencyDialog').showModal());
$('saveCurrencyBtn').addEventListener('click',()=>{applyCurrency($('currencySelect').value);showToast('Currency updated');loadMedicines()});
$('mainScanBtn').addEventListener('click',()=>$('scanDialog').showModal());
document.querySelector('[data-action="add"]').addEventListener('click',()=>{$('medicineForm').reset();resetPhotoPreview();toggleDosageFields();openAdd()});
document.querySelector('[data-scan-action="add"]').addEventListener('click',()=>$('photoInputCamera').click());
document.querySelectorAll('[data-action]:not([data-action="add"])').forEach(b=>b.addEventListener('click',()=>$('scanDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{closeDialog(b.dataset.close);if(b.dataset.close==='addMedicineDialog'){$('medicineForm').reset();resetPhotoPreview();toggleDosageFields()}}));
$('storageOnly').addEventListener('change',toggleDosageFields);
toggleDosageFields();
$('photoInputCamera').addEventListener('change',handlePhotoSelected);
$('photoInputGallery').addEventListener('change',handlePhotoSelected);
$('takePhotoBtn').addEventListener('click',()=>$('photoInputCamera').click());
$('uploadPhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('retakePhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('medicineForm').addEventListener('submit',saveMedicine);$('refreshBtn').addEventListener('click',loadMedicines);
$('medicineList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('expiredCard').addEventListener('click',()=>{renderExpiredList();$('expiredDialog').showModal()});
$('expiredList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('favoritesBtn').addEventListener('click',()=>{renderFavoritesList();$('favoritesDialog').showModal()});
$('favoritesList').addEventListener('click',e=>{const b=e.target.closest('[data-unfav-id]');if(b)removeFavorite(b.dataset.unfavId)});
$('shareReportBtn').addEventListener('click',()=>$('reportDialog').showModal());
$('nativeShareBtn').addEventListener('click',async()=>{const text=`My MedCabinet AI score is ${$('scoreValue').textContent}/100.`;try{if(navigator.share)await navigator.share({title:'My MedCabinet AI Report',text});else{await navigator.clipboard.writeText(text);showToast('Report copied')}}catch(e){if(e.name!=='AbortError')showToast('Sharing unavailable')}});
loadMedicines();
