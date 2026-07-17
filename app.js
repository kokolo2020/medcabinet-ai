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
let expiringSoonItems=[];
let currentItems=[];
let favoriteRows=[];
let homePage=1;
const PAGE_SIZE=10;
let editingId=null;
let editingPhotoUrl=null;
let editingOriginalPrice=null;
let editingPriceEstimated=false;

function favoriteMedicineIds(){return new Set(favoriteRows.filter(f=>f.medicine_id).map(f=>f.medicine_id))}

function medicineRowHtml(m,favIds){
 const thumb=m.photo_url?`<img class="medicine-thumb-img" src="${esc(m.photo_url)}" alt="${esc(m.brand_name||'')}">`:`<div class="medicine-thumb">${esc((m.brand_name||'?')[0].toUpperCase())}</div>`;
 const isFav=favIds.has(m.id);
 const runOut=estimateRunOutDate(m);
 const status=expiryStatus(m.expiry_date);
 const expiryClass=status==='Expired'?'expiry-tag-expired':status==='Expires soon'?'expiry-tag-soon':'expiry-tag-ok';
 const expiryHtml=m.expiry_date?`<span class="expiry-tag ${expiryClass}">Expires ${esc(m.expiry_date)}</span>`:'No expiry date';
 const subtext=[esc(m.category||m.dosage_form||'Medicine'),expiryHtml,runOut?'~runs out '+esc(runOut):''].filter(Boolean).join(' · ');
 return `<div class="medicine-row" data-id="${esc(m.id)}">${thumb}<div><strong>${esc(m.brand_name||'Unnamed medicine')} ${esc(m.strength||'')}</strong><small>${subtext}</small></div><span class="status ${status==='Expired'?'amber-status':status==='Expires soon'?'soon-status':'green-status'}">${status||esc((m.quantity||0)+' in stock')}</span><button type="button" class="fav-btn ${isFav?'is-fav':''}" data-fav-toggle="${esc(m.id)}" aria-label="Favorite">${isFav?'★':'☆'}</button><button type="button" class="edit-btn" data-edit-id="${esc(m.id)}" aria-label="Edit ${esc(m.brand_name||'medicine')}">✎</button><button type="button" class="delete-btn" data-delete-id="${esc(m.id)}" aria-label="Delete ${esc(m.brand_name||'medicine')}">🗑</button></div>`;
}

function renderMedicineList(){
 const favIds=favoriteMedicineIds();
 const totalPages=Math.max(1,Math.ceil(currentItems.length/PAGE_SIZE));
 if(homePage>totalPages)homePage=totalPages;
 const start=(homePage-1)*PAGE_SIZE;
 const pageItems=currentItems.slice(start,start+PAGE_SIZE);
 $('medicineList').innerHTML=pageItems.length?pageItems.map(m=>medicineRowHtml(m,favIds)).join(''):'<p class="empty-state">No medicines added yet. Tap <strong>Add medicine</strong> to create your first record.</p>';
 $('medicinePagination').innerHTML=totalPages>1?Array.from({length:totalPages},(_,i)=>i+1).map(p=>`<button type="button" class="page-btn ${p===homePage?'active':''}" data-page="${p}">${p}</button>`).join(''):'';
}

let cabinetActiveCategory='';
const CATEGORY_STYLES={
 'Pain relief':{icon:'💊',color:'var(--coral)',bg:'var(--coral-soft)'},
 'Cold & flu':{icon:'🤧',color:'var(--sky)',bg:'var(--sky-soft)'},
 'Allergy':{icon:'🌼',color:'var(--pink)',bg:'var(--pink-soft)'},
 'Antibiotic':{icon:'🧫',color:'var(--teal)',bg:'var(--teal-soft)'},
 'Anti-seizure':{icon:'⚡',color:'var(--purple)',bg:'var(--purple-soft)'},
 'Digestive':{icon:'🍽️',color:'var(--orange)',bg:'var(--orange-soft)'},
 'Vitamins & supplements':{icon:'🌿',color:'var(--emerald)',bg:'var(--mint-soft)'},
 'First aid':{icon:'🩹',color:'var(--amber)',bg:'var(--amber-soft)'},
 'Other':{icon:'📦',color:'var(--muted)',bg:'var(--paper-deep)'},
 Uncategorized:{icon:'❔',color:'var(--muted)',bg:'var(--paper-deep)'},
};

function renderCabinetList(){
 const favIds=favoriteMedicineIds();
 const allCats=[...new Set(currentItems.map(m=>m.category||'Uncategorized'))].sort((a,b)=>a.localeCompare(b));
 $('cabinetChips').innerHTML=[`<button type="button" class="chip ${!cabinetActiveCategory?'active':''}" data-cat="">All<span>${currentItems.length}</span></button>`]
  .concat(allCats.map(c=>{const style=CATEGORY_STYLES[c]||CATEGORY_STYLES.Other;return `<button type="button" class="chip ${cabinetActiveCategory===c?'active':''}" data-cat="${esc(c)}"><i class="chip-dot" style="background:${style.color}"></i>${esc(c)}<span>${currentItems.filter(m=>(m.category||'Uncategorized')===c).length}</span></button>`}))
  .join('');
 const groups={};
 currentItems.forEach(m=>{
  const cat=m.category||'Uncategorized';
  if(cabinetActiveCategory&&cat!==cabinetActiveCategory)return;
  (groups[cat]=groups[cat]||[]).push(m);
 });
 const catNames=Object.keys(groups).sort((a,b)=>a.localeCompare(b));
 $('cabinetList').innerHTML=catNames.length?catNames.map(cat=>{
  const items=groups[cat];
  const style=CATEGORY_STYLES[cat]||CATEGORY_STYLES.Other;
  return `<details class="category-group" open style="border-left-color:${style.color}"><summary class="category-group-header"><span class="category-group-title"><span class="category-icon-chip" style="background:${style.bg};color:${style.color}">${style.icon}</span>${esc(cat)}</span><span class="category-group-count">${items.length}</span></summary><div class="category-group-items">${items.map(m=>medicineRowHtml(m,favIds)).join('')}</div></details>`;
 }).join(''):'<p class="empty-state">No medicines in this category.</p>';
}

function renderExpiredList(){
 const favIds=favoriteMedicineIds();
 $('expiredList').innerHTML=expiredItems.length?expiredItems.map(m=>medicineRowHtml(m,favIds)).join(''):'<p class="empty-state">Nothing expired. Nice.</p>';
}

function renderExpiringSoonList(){
 const favIds=favoriteMedicineIds();
 $('expiringSoonList').innerHTML=expiringSoonItems.length?expiringSoonItems.map(m=>medicineRowHtml(m,favIds)).join(''):'<p class="empty-state">Nothing expiring soon.</p>';
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

let wasteRows=[];

async function renderWasteDialog(){
 const {data,error}=await sb.from('deleted_medicines').select('*').order('deleted_at',{ascending:false});
 if(error){console.error(error);showToast(error.message);return}
 wasteRows=data||[];
 const sym=symbols[currentCurrency()]||currentCurrency()+' ';
 const byYear={};
 wasteRows.forEach(r=>{const y=new Date(r.deleted_at).getFullYear();byYear[y]=(byYear[y]||0)+Number(r.purchase_price||0)});
 const years=Object.keys(byYear).sort((a,b)=>b-a);
 $('wasteSummary').innerHTML=years.length?years.map(y=>`<div class="waste-year-row"><strong>${y}</strong><span>${sym}${byYear[y].toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>`).join(''):'';
 renderWasteList();
}

function renderWasteList(){
 const sym=symbols[currentCurrency()]||currentCurrency()+' ';
 const q=$('wasteSearch').value.trim().toLowerCase();
 const rows=q?wasteRows.filter(r=>(r.brand_name||'').toLowerCase().includes(q)||(r.category||'').toLowerCase().includes(q)):wasteRows;
 $('wasteList').innerHTML=rows.length?rows.map(r=>{
  const priceText=r.purchase_price?`${sym}${Number(r.purchase_price).toLocaleString()}${r.price_estimated?' (estimated)':''}`:'No price recorded';
  const deletedDate=(r.deleted_at||'').slice(0,10);
  return `<div class="medicine-row"><div class="medicine-thumb">${esc((r.brand_name||'?')[0].toUpperCase())}</div><div><strong>${esc(r.brand_name||'Unnamed medicine')}</strong><small>${esc(priceText)} · deleted ${esc(deletedDate)}${r.was_expired?' · was expired':''}</small></div><span></span></div>`;
 }).join(''):(wasteRows.length?'<p class="empty-state">No matches.</p>':'<p class="empty-state">Nothing deleted yet.</p>');
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
  if($('expiringSoonDialog').open)renderExpiringSoonList();
  if($('favoritesDialog').open)renderFavoritesList();
  if($('cabinetDialog').open)renderCabinetList();
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
  if($('expiringSoonDialog').open)renderExpiringSoonList();
  if($('cabinetDialog').open)renderCabinetList();
 }catch(e){console.error(e);showToast(e.message)}
}

function resetPhotoPreview(){pendingPhotoFile=null;$('photoPreviewWrap').hidden=true;$('photoPreview').src='';$('scanPhotoOptions').hidden=false}
function showPhotoPreview(dataUrl){$('photoPreview').src=dataUrl;$('photoPreviewWrap').hidden=false;$('scanPhotoOptions').hidden=true}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function toggleDosageFields(){const on=!$('storageOnly').checked;$('dosageAmountLabel').hidden=!on;$('dosageFrequencyLabel').hidden=!on}

function resetEditState(){editingId=null;editingPhotoUrl=null;editingOriginalPrice=null;editingPriceEstimated=false;$('dialogEyebrow').textContent='New inventory item';$('dialogTitle').textContent='Add medicine';$('saveMedicineBtn').textContent='Save medicine'}

function editMedicine(id){
 const m=currentItems.find(i=>i.id===id)||expiredItems.find(i=>i.id===id);
 if(!m)return;
 $('medicineForm').reset();
 editingId=id;
 editingPhotoUrl=m.photo_url||null;
 editingOriginalPrice=m.purchase_price??null;
 editingPriceEstimated=m.price_estimated||false;
 $('brandName').value=m.brand_name||'';
 $('manufacturer').value=m.manufacturer||'';
 $('strength').value=m.strength||'';
 if(m.dosage_form&&[...$('dosageForm').options].some(o=>o.value===m.dosage_form))$('dosageForm').value=m.dosage_form;
 $('boxes').value=1;
 $('qtyPerBox').value=m.quantity||1;
 $('storageOnly').checked=!!m.is_storage_only;
 $('dosageAmount').value=m.dosage_amount||'';
 if(m.dosage_frequency)$('dosageFrequency').value=m.dosage_frequency;
 toggleDosageFields();
 $('expiryDate').value=m.expiry_date||'';
 if(m.category&&[...$('category').options].some(o=>o.value===m.category))$('category').value=m.category;
 let notes=m.notes||'',location='';
 const locMatch=notes.match(/(^|\n)Location: (.+)$/);
 if(locMatch){location=locMatch[2];notes=notes.replace(locMatch[0],'').trim()}
 $('storageLocation').value=location;
 $('purchasePrice').value=m.purchase_price??'';
 $('purchaseStore').value=m.purchase_store||'';
 $('barcode').value=m.barcode||'';
 $('notes').value=notes;
 pendingPhotoFile=null;
 if(m.photo_url)showPhotoPreview(m.photo_url);else resetPhotoPreview();
 $('dialogEyebrow').textContent='Editing';
 $('dialogTitle').textContent='Edit medicine';
 $('saveMedicineBtn').textContent='Update medicine';
 openAdd();
}

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
  const {data:items,error}=await sb.from('medicines').select('*').order('created_at',{ascending:false}).limit(500);
  if(error)throw new Error(error.message||'Load failed');
  currentItems=items;
  await loadFavorites();
  $('totalMedicines').textContent=items.length;
  const today=new Date();let expired=0,soon=0,low=0,total=0;
  expiredItems=[];
  expiringSoonItems=[];
  items.forEach(m=>{if(m.expiry_date){const d=(new Date(m.expiry_date+'T00:00:00')-today)/86400000;if(d<0){expired++;expiredItems.push(m)}else if(d<=90){soon++;expiringSoonItems.push(m)}}if((m.quantity||0)<=5)low++;total+=Number(m.purchase_price||0)});
  expiringSoonItems.sort((a,b)=>a.expiry_date.localeCompare(b.expiry_date));
  $('expiredCount').textContent=expired;$('expiringSoon').textContent=soon;$('lowStock').textContent=low;
  const code=currentCurrency(),sym=symbols[code]||code+' ';$('reportValue').textContent=`${sym}${total.toLocaleString()}`;
  $('reportMedicineCount').textContent=items.length;$('reportExpiredCount').textContent=expired;$('reportExpiringCount').textContent=soon;
  renderMedicineList();
  if($('expiredDialog').open)renderExpiredList();
  if($('expiringSoonDialog').open)renderExpiringSoonList();
  if($('favoritesDialog').open)renderFavoritesList();
  if($('cabinetDialog').open)renderCabinetList();
 }catch(e){console.error(e);showToast(e.message)}
}

async function deleteMedicine(id){
 if(!confirm('Delete this medicine?'))return;
 try{
  const m=currentItems.find(i=>i.id===id)||expiredItems.find(i=>i.id===id);
  if(m){
   const wasExpired=!!(m.expiry_date&&new Date(m.expiry_date+'T00:00:00')<new Date());
   const {error:logErr}=await sb.from('deleted_medicines').insert({medicine_id:m.id,brand_name:m.brand_name,category:m.category,quantity:m.quantity,purchase_price:m.purchase_price,price_estimated:m.price_estimated||false,currency:m.currency,expiry_date:m.expiry_date,was_expired:wasExpired});
   if(logErr)console.error('waste log failed',logErr);
  }
  const {error}=await sb.from('medicines').delete().eq('id',id);
  if(error)throw new Error(error.message||'Delete failed');
  showToast('Medicine deleted');
  await loadMedicines();
 }catch(e){console.error(e);showToast(e.message)}
}

async function estimatePrice(payload,boxes,qtyPerBox){
 try{
  const r=await fetch('/.netlify/functions/estimate-price',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand_name:payload.brand_name,generic_name:null,strength:payload.strength,dosage_form:payload.dosage_form,manufacturer:payload.manufacturer,quantity:payload.quantity,currency:payload.currency})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||typeof data.estimated_price!=='number')return null;
  return data.estimated_price;
 }catch(err){console.error('estimate-price failed',err);return null}
}

async function saveMedicine(e){
 e.preventDefault();
 const isEdit=!!editingId;
 const btn=$('saveMedicineBtn');btn.disabled=true;btn.textContent=isEdit?'Updating…':'Saving…';
 const location=$('storageLocation').value.trim();const notes=$('notes').value.trim();
 try{
  let photo_url=isEdit?editingPhotoUrl:null;
  if(pendingPhotoFile){btn.textContent='Uploading photo…';photo_url=await uploadPhoto(pendingPhotoFile)}
  const boxes=Number($('boxes').value||0),qtyPerBox=Number($('qtyPerBox').value||0);
  const isStorageOnly=$('storageOnly').checked;
  const enteredPrice=$('purchasePrice').value?Number($('purchasePrice').value):null;
  const keepsEstimateFlag=isEdit&&enteredPrice!==null&&enteredPrice===editingOriginalPrice&&editingPriceEstimated;
  const payload={brand_name:$('brandName').value.trim(),manufacturer:$('manufacturer').value.trim()||null,strength:$('strength').value.trim()||null,dosage_form:$('dosageForm').value||null,quantity:boxes*qtyPerBox,is_storage_only:isStorageOnly,dosage_amount:isStorageOnly?null:($('dosageAmount').value?Number($('dosageAmount').value):null),dosage_frequency:isStorageOnly?null:$('dosageFrequency').value,expiry_date:$('expiryDate').value||null,category:$('category').value||null,purchase_price:enteredPrice,price_estimated:keepsEstimateFlag,currency:currentCurrency(),purchase_store:$('purchaseStore').value.trim()||null,barcode:$('barcode').value.trim()||null,photo_url,notes:[notes,location?`Location: ${location}`:''].filter(Boolean).join('\n')||null};
  if(enteredPrice===null&&payload.brand_name){
   btn.textContent='Estimating price…';
   const est=await estimatePrice(payload,boxes,qtyPerBox);
   if(est!==null){payload.purchase_price=est;payload.price_estimated=true}
  }
  btn.textContent=isEdit?'Updating…':'Saving…';
  if(isEdit){
   const {error}=await sb.from('medicines').update(payload).eq('id',editingId);
   if(error)throw new Error(error.message||error.hint||'Update failed');
  }else{
   const {error}=await sb.from('medicines').insert(payload);
   if(error)throw new Error(error.message||error.hint||'Save failed');
  }
  $('medicineForm').reset();$('boxes').value=1;$('qtyPerBox').value=1;resetPhotoPreview();toggleDosageFields();resetEditState();closeDialog('addMedicineDialog');showToast(payload.price_estimated?'Saved with an estimated price':(isEdit?'Medicine updated':'Medicine saved'));await loadMedicines();
 }catch(e){console.error(e);showToast(e.message||'Save failed')}finally{btn.disabled=false;btn.textContent=editingId?'Update medicine':'Save medicine'}
}

setGreeting();const saved=currentCurrency();$('currencySelect').value=saved;applyCurrency(saved);
$('currencyBtn').addEventListener('click',()=>$('currencyDialog').showModal());
$('saveCurrencyBtn').addEventListener('click',()=>{applyCurrency($('currencySelect').value);showToast('Currency updated');loadMedicines()});
$('navHome').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'})});
$('navProfile').addEventListener('click',()=>{$('profileDialog').showModal()});
$('navCabinet').addEventListener('click',()=>{cabinetActiveCategory='';renderCabinetList();$('cabinetDialog').showModal()});
$('cabinetChips').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;cabinetActiveCategory=b.dataset.cat;renderCabinetList()});
$('medicinePagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){homePage=Number(b.dataset.page);renderMedicineList();$('cabinetSection').scrollIntoView({behavior:'smooth',block:'start'})}});
$('mainScanBtn').addEventListener('click',()=>$('scanDialog').showModal());
document.querySelector('[data-action="add"]').addEventListener('click',()=>{resetEditState();$('medicineForm').reset();resetPhotoPreview();toggleDosageFields();openAdd()});
document.querySelector('[data-scan-action="add"]').addEventListener('click',()=>$('photoInputCamera').click());
document.querySelectorAll('[data-action]:not([data-action="add"])').forEach(b=>b.addEventListener('click',()=>$('scanDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{closeDialog(b.dataset.close);if(b.dataset.close==='addMedicineDialog'){resetEditState();$('medicineForm').reset();resetPhotoPreview();toggleDosageFields()}}));
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
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('expiringSoonCard').addEventListener('click',()=>{renderExpiringSoonList();$('expiringSoonDialog').showModal()});
$('expiringSoonList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('expiredCard').addEventListener('click',()=>{renderExpiredList();$('expiredDialog').showModal()});
$('expiredList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('favoritesBtn').addEventListener('click',()=>{renderFavoritesList();$('favoritesDialog').showModal()});
$('wasteBtn').addEventListener('click',()=>{$('wasteSearch').value='';renderWasteDialog();$('wasteDialog').showModal()});
$('wasteSearch').addEventListener('input',renderWasteList);
$('favoritesList').addEventListener('click',e=>{const b=e.target.closest('[data-unfav-id]');if(b)removeFavorite(b.dataset.unfavId)});
$('cabinetList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav)toggleFavorite(fav.dataset.favToggle);
});
$('shareReportBtn').addEventListener('click',()=>$('reportDialog').showModal());
$('nativeShareBtn').addEventListener('click',async()=>{const text=`My MedCabinet AI score is ${$('scoreValue').textContent}/100.`;try{if(navigator.share)await navigator.share({title:'My MedCabinet AI Report',text});else{await navigator.clipboard.writeText(text);showToast('Report copied')}}catch(e){if(e.name!=='AbortError')showToast('Sharing unavailable')}});
loadMedicines();
