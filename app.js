const symbols={THB:'฿',USD:'$',EUR:'€',GBP:'£',SGD:'S$',KHR:'៛',JPY:'¥'};
const cfg=window.MEDCABINET_CONFIG;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);

let pendingLoginEmail='';

function showLoginScreen(){$('loginScreen').hidden=false}
function hideLoginScreen(){$('loginScreen').hidden=true}

async function sendOtp(){
 const email=$('loginEmail').value.trim();
 if(!email){showToast('Enter your email first');return}
 const btn=$('sendOtpBtn');const original=btn.textContent;
 btn.disabled=true;btn.textContent='Sending…';
 try{
  const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(error)throw new Error(error.message);
  pendingLoginEmail=email;
  $('loginSubtitle').textContent=`We sent a 6-digit code to ${email}`;
  $('loginStepEmail').hidden=true;
  $('loginStepCode').hidden=false;
  $('loginCode').focus();
 }catch(e){console.error(e);showToast(e.message||'Could not send code')}
 finally{btn.disabled=false;btn.textContent=original}
}

async function verifyOtp(){
 const token=$('loginCode').value.trim();
 if(token.length!==6){showToast('Enter the 6-digit code');return}
 const btn=$('verifyOtpBtn');const original=btn.textContent;
 btn.disabled=true;btn.textContent='Verifying…';
 try{
  const {error}=await sb.auth.verifyOtp({email:pendingLoginEmail,token,type:'email'});
  if(error)throw new Error(error.message);
  hideLoginScreen();
  await initApp();
 }catch(e){console.error(e);showToast(e.message||'Invalid or expired code')}
 finally{btn.disabled=false;btn.textContent=original}
}

async function initApp(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){showLoginScreen();return}
 $('profileAccountLine').textContent=`Signed in as ${session.user.email}`;
 await loadMedicines();
}
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
 return `<div class="medicine-row medicine-row-rich" data-id="${esc(m.id)}"><div class="row-main">${thumb}<div class="row-text"><strong>${esc(m.brand_name||'Unnamed medicine')} ${esc(m.strength||'')}</strong><small>${subtext}</small></div></div><div class="row-actions"><span class="status ${status==='Expired'?'amber-status':status==='Expires soon'?'soon-status':'green-status'}">${status||esc((m.quantity||0)+' in stock')}</span><button type="button" class="fav-btn ${isFav?'is-fav':''}" data-fav-toggle="${esc(m.id)}" aria-label="Favorite">${isFav?'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>'}</button><button type="button" class="edit-btn" data-edit-id="${esc(m.id)}" aria-label="Edit ${esc(m.brand_name||'medicine')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3.5l3.5 3.5L8 19.5 4 20l.5-4z"/></svg></button><button type="button" class="delete-btn" data-delete-id="${esc(m.id)}" aria-label="Delete ${esc(m.brand_name||'medicine')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/></svg></button></div></div>`;
}

function renderCategoryChart(){
 if(!currentItems.length){$('categoryChart').innerHTML='<p class="empty-state">No medicines added yet. Tap <strong>Add medicine</strong> to create your first record.</p>';return}
 const counts={};
 currentItems.forEach(m=>{const c=m.category||'Uncategorized';counts[c]=(counts[c]||0)+1});
 const max=Math.max(...Object.values(counts));
 const rows=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map(cat=>{
  const style=CATEGORY_STYLES[cat]||CATEGORY_STYLES.Other;
  const n=counts[cat];
  const pct=Math.round((n/max)*100);
  return `<div class="chart-row"><span class="chart-icon" style="background:${style.bg};color:${style.color}">${style.icon}</span><span class="chart-label">${esc(cat)}</span><span class="chart-track"><span class="chart-bar" style="width:${pct}%;background:${style.color}"></span></span><span class="chart-count">${n}</span></div>`;
 }).join('');
 $('categoryChart').innerHTML=rows;
}
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

const CATEGORY_KEYWORDS={
 'Pain relief':['pain','headache','fever','ache','migraine'],
 'Cold & flu':['cough','cold','flu','congestion','sore throat','sneeze','runny nose'],
 'Allergy':['allergy','allergic','antihistamine','itch','rash','hay fever'],
 'Antibiotic':['antibiotic','infection'],
 'Anti-seizure':['seizure','epilepsy'],
 'Digestive':['stomach','digestive','diarrhea','nausea','indigestion','constipation','vomit'],
 'Vitamins & supplements':['vitamin','supplement','mineral'],
 'First aid':['first aid','wound','bandage','cut','antiseptic'],
};

function medicineMatchesQuery(m,q){
 if(!q)return true;
 const haystack=[m.brand_name,m.manufacturer,m.category,m.strength,m.barcode,parseLocation(m.notes)].filter(Boolean).join(' ').toLowerCase();
 if(haystack.includes(q))return true;
 const keywords=CATEGORY_KEYWORDS[m.category||'']||[];
 return keywords.some(k=>k.includes(q)||q.includes(k));
}

let cabinetSearchQuery='';

function shelfCardHtml(m){
 const thumb=m.photo_url?`<img src="${esc(m.photo_url)}" alt="${esc(m.brand_name||'')}">`:`<div class="shelf-card-fallback">${esc((m.brand_name||'?')[0].toUpperCase())}</div>`;
 const status=expiryStatus(m.expiry_date);
 const statusClass=status==='Expired'?'amber-status':status==='Expires soon'?'soon-status':'green-status';
 return `<button type="button" class="shelf-card" data-id="${esc(m.id)}"><div class="shelf-card-photo">${thumb}</div><div class="shelf-card-info"><strong>${esc(m.brand_name||'Unnamed')}</strong>${m.strength?`<small>${esc(m.strength)}</small>`:''}${status?`<span class="status ${statusClass} shelf-status">${esc(status)}</span>`:''}</div></button>`;
}

function truncateText(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s}

function parseLocation(notes){
 const m=(notes||'').match(/(^|\n)Location: (.+)$/);
 return m?m[2]:'';
}

async function buildInventoryPdf(){
 if(!window.jspdf)throw new Error('PDF library still loading — try again in a second');
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({unit:'pt',format:'a4'});
 const marginX=40;
 const pageHeight=doc.internal.pageSize.getHeight();
 const pageWidth=doc.internal.pageSize.getWidth();
 let y=52;

 doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(18,70,59);
 doc.text('MedCabinet AI — Full Inventory',marginX,y);
 y+=18;
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()} · ${currentItems.length} medicines`,marginX,y);
  y+=26;

  const imageCache={};
  await Promise.all(currentItems.filter(m=>m.photo_url).map(async m=>{
   try{
    const res=await fetch(m.photo_url);
    const blob=await res.blob();
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
    imageCache[m.id]=dataUrl;
   }catch(e){console.error('PDF image fetch failed for',m.brand_name,e)}
  }));

  const groups={};
  currentItems.forEach(m=>{(groups[m.category||'Uncategorized']=groups[m.category||'Uncategorized']||[]).push(m)});
  const catNames=Object.keys(groups).sort((a,b)=>a.localeCompare(b));

  const colX={photo:marginX,name:marginX+30,expiry:marginX+195,location:marginX+280,updated:marginX+400};
  const rowH=24;
  const photoSize=18;

  function ensureSpace(needed){
   if(y+needed>pageHeight-40){doc.addPage();y=50}
  }

  catNames.forEach(cat=>{
   ensureSpace(46);
   doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(18,70,59);
   doc.text(cat,marginX,y);
   y+=5;
   doc.setDrawColor(220,220,210);doc.line(marginX,y,pageWidth-marginX,y);
   y+=11;
   doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(140,140,140);
   doc.text('NAME',colX.name,y);doc.text('EXPIRY',colX.expiry,y);doc.text('LOCATION',colX.location,y);doc.text('LAST UPDATED',colX.updated,y);
   y+=8;
   const sortedItems=[...groups[cat]].sort((a,b)=>{
    if(!a.expiry_date&&!b.expiry_date)return 0;
    if(!a.expiry_date)return 1;
    if(!b.expiry_date)return -1;
    return a.expiry_date.localeCompare(b.expiry_date);
   });
   sortedItems.forEach(m=>{
    ensureSpace(rowH);
    const imgData=imageCache[m.id];
    const textY=y+photoSize/2+3;
    if(imgData){
     try{doc.addImage(imgData,colX.photo,y,photoSize,photoSize,undefined,'FAST')}catch(e){}
    }else{
     doc.setFillColor(231,244,238);doc.roundedRect(colX.photo,y,photoSize,photoSize,3,3,'F');
     doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(31,111,92);
     doc.text((m.brand_name||'?')[0].toUpperCase(),colX.photo+photoSize/2,y+photoSize/2+3,{align:'center'});
    }
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(20,30,28);
    doc.text(truncateText(`${m.brand_name||'Unnamed'}${m.strength?' '+m.strength:''}`,30),colX.name,textY);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(60,70,66);
    const status=expiryStatus(m.expiry_date);
    if(m.expiry_date){
     if(status==='Expired'){doc.setFont('helvetica','bold');doc.setTextColor(200,90,69)}
     else if(status==='Expires soon'){doc.setFont('helvetica','bold');doc.setTextColor(232,98,10)}
     else{doc.setTextColor(29,104,196)}
     doc.text(m.expiry_date,colX.expiry,textY);
     doc.setFont('helvetica','normal');doc.setTextColor(60,70,66);
    }else{
     doc.text('—',colX.expiry,textY);
    }
    doc.text(truncateText(parseLocation(m.notes)||'—',24),colX.location,textY);
    doc.text((m.updated_at||m.created_at||'').slice(0,10)||'—',colX.updated,textY);
    y+=rowH;
   });
   y+=6;
 });

 return doc;
}

async function generatePdfReport(){
 const btn=$('cabinetPdfBtn');
 const originalText=btn.textContent;
 btn.disabled=true;btn.textContent='Preparing PDF…';
 try{
  const doc=await buildInventoryPdf();
  doc.save(`medcabinet-inventory-${new Date().toISOString().slice(0,10)}.pdf`);
 }catch(e){console.error(e);showToast('Could not generate PDF: '+e.message)}
 finally{btn.disabled=false;btn.textContent=originalText}
}

async function sharePdfViaQr(){
 const btn=$('qrShareBtn');
 const originalText=btn.textContent;
 btn.disabled=true;btn.textContent='Preparing shareable link…';
 try{
  if(!window.QRCode)throw new Error('QR library still loading — try again in a second');
  const doc=await buildInventoryPdf();
  const blob=doc.output('blob');
  const path=`reports/${crypto.randomUUID()}.pdf`;
  const {error:uploadErr}=await sb.storage.from('medicine-photos').upload(path,blob,{contentType:'application/pdf'});
  if(uploadErr)throw new Error(uploadErr.message||'Could not upload PDF');
  const {data}=sb.storage.from('medicine-photos').getPublicUrl(path);
  const url=data.publicUrl;
  const qrDataUrl=await QRCode.toDataURL(url,{width:240,margin:1,color:{dark:'#12463b',light:'#faf7f0'}});
  $('qrImageWrap').innerHTML=`<img src="${qrDataUrl}" alt="QR code linking to your PDF report" width="240" height="240">`;
  $('qrShareUrl').value=url;
  $('qrShareDialog').showModal();
 }catch(e){console.error(e);showToast(e.message||'Could not create shareable link')}
 finally{btn.disabled=false;btn.textContent=originalText}
}

function renderCabinetList(){
 const favIds=favoriteMedicineIds();
 const q=cabinetSearchQuery.trim().toLowerCase();
 const searchedItems=currentItems.filter(m=>medicineMatchesQuery(m,q));
 const allCats=[...new Set(currentItems.map(m=>m.category||'Uncategorized'))].sort((a,b)=>a.localeCompare(b));
 $('cabinetChips').innerHTML=[`<button type="button" class="chip ${!cabinetActiveCategory?'active':''}" data-cat="">All<span>${searchedItems.length}</span></button>`]
  .concat(allCats.map(c=>{const style=CATEGORY_STYLES[c]||CATEGORY_STYLES.Other;return `<button type="button" class="chip ${cabinetActiveCategory===c?'active':''}" data-cat="${esc(c)}"><i class="chip-dot" style="background:${style.color}"></i>${esc(c)}<span>${searchedItems.filter(m=>(m.category||'Uncategorized')===c).length}</span></button>`}))
  .join('');
 const groups={};
 searchedItems.forEach(m=>{
  const cat=m.category||'Uncategorized';
  if(cabinetActiveCategory&&cat!==cabinetActiveCategory)return;
  (groups[cat]=groups[cat]||[]).push(m);
 });
 const catNames=Object.keys(groups).sort((a,b)=>a.localeCompare(b));
 $('cabinetList').innerHTML=catNames.length?catNames.map(cat=>{
  const items=groups[cat];
  const style=CATEGORY_STYLES[cat]||CATEGORY_STYLES.Other;
  return `<details class="category-group" open style="border-left-color:${style.color}"><summary class="category-group-header"><span class="category-group-title"><span class="category-icon-chip" style="background:${style.bg};color:${style.color}">${style.icon}</span>${esc(cat)}</span><span class="category-group-count">${items.length}</span></summary><div class="shelf-grid">${items.map(m=>shelfCardHtml(m)).join('')}</div></details>`;
 }).join(''):`<p class="empty-state">${q?'No matches for that search.':'No medicines in this category.'}</p>`;
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
  return `<div class="medicine-row" data-id="${esc(f.id)}">${thumb}<div><strong>${esc(f.brand_name||'Unnamed medicine')} ${esc(f.strength||'')}</strong><small>${esc(f.category||f.dosage_form||'Medicine')}</small></div><span></span><button type="button" class="delete-btn" data-unfav-id="${esc(f.id)}" aria-label="Remove ${esc(f.brand_name||'medicine')} from favorites"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/></svg></button></div>`;
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
 const fmt=n=>`${sym}${n.toLocaleString(undefined,{maximumFractionDigits:0})}`;
 const byYear={};
 wasteRows.forEach(r=>{const y=new Date(r.deleted_at).getFullYear();byYear[y]=(byYear[y]||0)+Number(r.purchase_price||0)});
 const years=Object.keys(byYear).sort((a,b)=>b-a);
 const expiredInCabinet=expiredItems.reduce((t,m)=>t+Number(m.purchase_price||0),0);
 const deletedExpired=wasteRows.filter(r=>r.was_expired).reduce((t,r)=>t+Number(r.purchase_price||0),0);
 const totalLostToExpiry=expiredInCabinet+deletedExpired;
 let html='';
 html+=`<div class="waste-total-row"><strong>💸 Total lost to expiry</strong><span>${fmt(totalLostToExpiry)}</span></div>`;
 if(expiredInCabinet>0)html+=`<div class="waste-year-row"><strong>Expired, still in cabinet (${expiredItems.length})</strong><span>${fmt(expiredInCabinet)}</span></div>`;
 html+=years.map(y=>`<div class="waste-year-row"><strong>Deleted in ${y}</strong><span>${fmt(byYear[y])}</span></div>`).join('');
 $('wasteSummary').innerHTML=html;
 renderWasteList();
}

function renderWasteList(){
 const sym=symbols[currentCurrency()]||currentCurrency()+' ';
 const q=$('wasteSearch').value.trim().toLowerCase();
 const rows=q?wasteRows.filter(r=>(r.brand_name||'').toLowerCase().includes(q)||(r.category||'').toLowerCase().includes(q)):wasteRows;
 $('wasteList').innerHTML=rows.length?rows.map(r=>{
  const priceText=r.purchase_price?`${sym}${Number(r.purchase_price).toLocaleString()}${r.price_estimated?' (estimated)':''}`:'No price recorded';
  const deletedDate=(r.deleted_at||'').slice(0,10);
  const thumb=r.photo_url?`<img class="medicine-thumb-img" src="${esc(r.photo_url)}" alt="${esc(r.brand_name||'')}">`:`<div class="medicine-thumb">${esc((r.brand_name||'?')[0].toUpperCase())}</div>`;
  return `<div class="medicine-row"><div class="row-main">${thumb}<div class="row-text"><strong>${esc(r.brand_name||'Unnamed medicine')}</strong><small>${esc(priceText)} · deleted ${esc(deletedDate)}${r.was_expired?' · was expired':''}</small></div></div></div>`;
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
  renderCategoryChart();
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
  renderCategoryChart();
  if($('expiredDialog').open)renderExpiredList();
  if($('expiringSoonDialog').open)renderExpiringSoonList();
  if($('cabinetDialog').open)renderCabinetList();
 }catch(e){console.error(e);showToast(e.message)}
}

function resetPhotoPreview(){pendingPhotoFile=null;$('photoPreviewWrap').hidden=true;$('photoPreview').src='';$('scanPhotoOptions').hidden=false}
function showPhotoPreview(dataUrl){$('photoPreview').src=dataUrl;$('photoPreviewWrap').hidden=false;$('scanPhotoOptions').hidden=true}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function toggleDosageFields(){const on=!$('storageOnly').checked;$('dosageAmountLabel').hidden=!on;$('dosageFrequencyLabel').hidden=!on}

function openDetail(id){
 const m=currentItems.find(i=>i.id===id)||expiredItems.find(i=>i.id===id)||expiringSoonItems.find(i=>i.id===id);
 if(!m)return;
 $('detailPhoto').innerHTML=m.photo_url?`<img src="${esc(m.photo_url)}" alt="${esc(m.brand_name||'')}">`:`<span class="detail-photo-fallback">${esc((m.brand_name||'?')[0].toUpperCase())}</span>`;
 $('detailName').textContent=[m.brand_name,m.strength].filter(Boolean).join(' ')||'Unnamed medicine';
 const status=expiryStatus(m.expiry_date);
 $('detailStatus').textContent=status||`${m.quantity||0} in stock`;
 $('detailStatus').className='status '+(status==='Expired'?'amber-status':status==='Expires soon'?'soon-status':'green-status');
 const cat=m.category||'Uncategorized';
 const catStyle=CATEGORY_STYLES[cat]||CATEGORY_STYLES.Other;
 $('detailCategoryTag').textContent=`${catStyle.icon} ${cat}`;
 $('detailCategoryTag').style.background=catStyle.bg;
 $('detailCategoryTag').style.color=catStyle.color;
 let notes=m.notes||'',location='';
 const locMatch=notes.match(/(^|\n)Location: (.+)$/);
 if(locMatch){location=locMatch[2];notes=notes.replace(locMatch[0],'').trim()}
 const runOut=estimateRunOutDate(m);
 const rows=[
  ['📦','Quantity',m.quantity?String(m.quantity):null],
  ['🧾','Form',m.dosage_form&&m.dosage_form!=='Other'?m.dosage_form:null],
  ['📅','Expiry date',m.expiry_date||null],
  ['📍','Location',location||null],
  ['🏭','Manufacturer',m.manufacturer||null],
  ['💰','Purchase price',m.purchase_price?`${symbols[m.currency]||m.currency+' '}${Number(m.purchase_price).toLocaleString()}${m.price_estimated?' (est.)':''}`:null],
  ['🏪','Bought at',m.purchase_store||null],
  ['💊','Dosage',m.is_storage_only?'For storage only':(m.dosage_amount?`${m.dosage_amount} per ${m.dosage_frequency}`:null)],
  ['⏳','Estimated run-out',runOut||null],
  ['🔖','Barcode',m.barcode||null],
  ['📝','Notes',notes||null],
 ].filter(r=>r[2]);
 $('detailRows').innerHTML=rows.map(([icon,label,value])=>`<div class="detail-row"><span class="detail-row-label">${icon} ${esc(label)}</span><span class="detail-row-value">${esc(value)}</span></div>`).join('');
 const isFav=favoriteMedicineIds().has(m.id);
 $('detailFavBtn').textContent=isFav?'★ Favorited':'☆ Favorite';
 $('detailDialog').dataset.id=m.id;
 $('detailDialog').showModal();
}

function matchKey(brand,strength){return `${(brand||'').trim().toLowerCase()}|${(strength||'').trim().toLowerCase()}`}

function findExistingMatch(data){
 if(data.barcode){
  const byBarcode=currentItems.find(m=>m.barcode&&m.barcode.trim()&&m.barcode.trim()===String(data.barcode).trim());
  if(byBarcode)return byBarcode;
 }
 if(data.brand_name){
  const key=matchKey(data.brand_name,data.strength);
  return currentItems.find(m=>matchKey(m.brand_name,m.strength)===key)||null;
 }
 return null;
}

let pendingMatch=null;

function openMatchFoundDialog(matched,data,dataUrl,file){
 pendingMatch={matched,data,dataUrl,file};
 $('matchFoundName').textContent=[matched.brand_name,matched.strength].filter(Boolean).join(' ');
 $('matchFoundPhoto').innerHTML=matched.photo_url?`<img src="${esc(matched.photo_url)}" alt="">`:`<div class="medicine-thumb">${esc((matched.brand_name||'?')[0].toUpperCase())}</div>`;
 $('matchFoundDialog').showModal();
}

function proceedAsNewMedicine(data,dataUrl){
 openAdd();
 fillFormFromScan(data);
 showPhotoPreview(dataUrl);
 showToast(data.expiry_date?'Scanned — check the details and save':'Scanned — no expiry date found');
 if(!data.expiry_date)$('expiryPromptDialog').showModal();
}

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
  const matched=findExistingMatch(data);
  if(matched){
   openMatchFoundDialog(matched,data,dataUrl,file);
  }else{
   proceedAsNewMedicine(data,dataUrl);
  }
 }catch(err){
  console.error(err);
  pendingPhotoFile=file;
  openAdd();
  try{showPhotoPreview(await fileToDataUrl(file))}catch{}
  showToast(err.message||'Could not auto-scan, fill in manually');
 }finally{scanInProgress=false}
}

let expiryScanInProgress=false;

async function handleExpiryPhotoSelected(e){
 const file=e.target.files[0];
 e.target.value='';
 if(!file||expiryScanInProgress)return;
 expiryScanInProgress=true;
 showToast('Reading expiry date…');
 try{
  const dataUrl=await fileToDataUrl(file);
  const base64=dataUrl.split(',')[1];
  const r=await fetch('/.netlify/functions/scan-medicine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mediaType:file.type||'image/jpeg'})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||`Scan failed (${r.status})`);
  if(data.expiry_date){$('expiryDate').value=data.expiry_date;showToast('Expiry date filled in')}
  else showToast("Couldn't find a date in that photo");
 }catch(err){
  console.error(err);
  showToast(err.message||'Could not read expiry date');
 }finally{expiryScanInProgress=false}
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
  renderCategoryChart();
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
   const {error:logErr}=await sb.from('deleted_medicines').insert({medicine_id:m.id,brand_name:m.brand_name,category:m.category,quantity:m.quantity,purchase_price:m.purchase_price,price_estimated:m.price_estimated||false,currency:m.currency,expiry_date:m.expiry_date,was_expired:wasExpired,photo_url:m.photo_url||null,notes:m.notes||null});
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
   const {error}=await sb.from('medicines').update({...payload,updated_at:new Date().toISOString()}).eq('id',editingId);
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
$('navCabinet').addEventListener('click',()=>{cabinetActiveCategory='';cabinetSearchQuery='';$('cabinetSearch').value='';renderCabinetList();$('cabinetDialog').showModal()});
$('cabinetPdfBtn').addEventListener('click',generatePdfReport);
$('qrShareBtn').addEventListener('click',sharePdfViaQr);
$('qrCopyBtn').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('qrShareUrl').value);showToast('Link copied')}
 catch{$('qrShareUrl').select();document.execCommand('copy');showToast('Link copied')}
});
$('cabinetSearch').addEventListener('input',e=>{cabinetSearchQuery=e.target.value;renderCabinetList()});
$('cabinetChips').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;cabinetActiveCategory=b.dataset.cat;renderCabinetList()});
$('breakdownCabinetLink').addEventListener('click',()=>{cabinetActiveCategory='';cabinetSearchQuery='';$('cabinetSearch').value='';renderCabinetList();$('cabinetDialog').showModal()});
$('mainScanBtn').addEventListener('click',()=>$('scanDialog').showModal());
document.querySelector('[data-action="add"]').addEventListener('click',()=>{resetEditState();$('medicineForm').reset();resetPhotoPreview();toggleDosageFields();openAdd()});
document.querySelector('[data-scan-action="add"]').addEventListener('click',()=>$('photoInputCamera').click());
document.querySelectorAll('[data-action]:not([data-action="add"])').forEach(b=>b.addEventListener('click',()=>$('scanDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{closeDialog(b.dataset.close);if(b.dataset.close==='addMedicineDialog'){resetEditState();$('medicineForm').reset();resetPhotoPreview();toggleDosageFields()}}));
$('storageOnly').addEventListener('change',toggleDosageFields);
toggleDosageFields();
$('photoInputCamera').addEventListener('change',handlePhotoSelected);
$('photoInputGallery').addEventListener('change',handlePhotoSelected);
$('photoInputExpiry').addEventListener('change',handleExpiryPhotoSelected);
$('scanExpiryBtn').addEventListener('click',()=>$('photoInputExpiry').click());
$('matchUpdatePhotoBtn').addEventListener('click',async()=>{
 const {matched,file}=pendingMatch;
 closeDialog('matchFoundDialog');
 showToast('Updating photo…');
 try{
  const url=await uploadPhoto(file);
  const {error}=await sb.from('medicines').update({photo_url:url,updated_at:new Date().toISOString()}).eq('id',matched.id);
  if(error)throw new Error(error.message||'Could not update photo');
  showToast('Photo updated');
  await loadMedicines();
 }catch(e){console.error(e);showToast(e.message)}
});
$('matchUpdateInfoBtn').addEventListener('click',()=>{
 const {matched,data,dataUrl,file}=pendingMatch;
 closeDialog('matchFoundDialog');
 editMedicine(matched.id);
 if(data.expiry_date)$('expiryDate').value=data.expiry_date;
 if(data.manufacturer)$('manufacturer').value=data.manufacturer;
 if(data.barcode)$('barcode').value=data.barcode;
 pendingPhotoFile=file;
 showPhotoPreview(dataUrl);
});
$('matchAddNewBtn').addEventListener('click',()=>{
 const {data,dataUrl}=pendingMatch;
 closeDialog('matchFoundDialog');
 proceedAsNewMedicine(data,dataUrl);
});
$('expiryPromptTakeBtn').addEventListener('click',()=>{$('photoInputExpiry').click();closeDialog('expiryPromptDialog')});
$('expiryPromptSkipBtn').addEventListener('click',()=>{closeDialog('expiryPromptDialog');$('expiryDate').focus()});
$('takePhotoBtn').addEventListener('click',()=>$('photoInputCamera').click());
$('uploadPhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('retakePhotoBtn').addEventListener('click',()=>$('photoInputGallery').click());
$('medicineForm').addEventListener('submit',saveMedicine);
$('expiringSoonCard').addEventListener('click',()=>{renderExpiringSoonList();$('expiringSoonDialog').showModal()});
$('expiringSoonList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav){toggleFavorite(fav.dataset.favToggle);return}
 const row=e.target.closest('.medicine-row');if(row)openDetail(row.dataset.id);
});
$('expiredCard').addEventListener('click',()=>{renderExpiredList();$('expiredDialog').showModal()});
$('expiredList').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete-id]');if(del){deleteMedicine(del.dataset.deleteId);return}
 const edit=e.target.closest('[data-edit-id]');if(edit){editMedicine(edit.dataset.editId);return}
 const fav=e.target.closest('[data-fav-toggle]');if(fav){toggleFavorite(fav.dataset.favToggle);return}
 const row=e.target.closest('.medicine-row');if(row)openDetail(row.dataset.id);
});
$('favoritesBtn').addEventListener('click',()=>{renderFavoritesList();$('favoritesDialog').showModal()});
$('wasteBtn').addEventListener('click',()=>{$('wasteSearch').value='';renderWasteDialog();$('wasteDialog').showModal()});
$('wasteSearch').addEventListener('input',renderWasteList);
$('favoritesList').addEventListener('click',e=>{const b=e.target.closest('[data-unfav-id]');if(b)removeFavorite(b.dataset.unfavId)});
$('cabinetList').addEventListener('click',e=>{
 const card=e.target.closest('.shelf-card');if(card)openDetail(card.dataset.id);
});
$('shareReportBtn').addEventListener('click',()=>$('reportDialog').showModal());
$('detailEditBtn').addEventListener('click',()=>{const id=$('detailDialog').dataset.id;closeDialog('detailDialog');editMedicine(id)});
$('detailFavBtn').addEventListener('click',async()=>{const id=$('detailDialog').dataset.id;await toggleFavorite(id);const isFav=favoriteMedicineIds().has(id);$('detailFavBtn').textContent=isFav?'★ Favorited':'☆ Favorite'});
$('detailDeleteBtn').addEventListener('click',async()=>{const id=$('detailDialog').dataset.id;await deleteMedicine(id);closeDialog('detailDialog')});
$('nativeShareBtn').addEventListener('click',async()=>{const text=`My MedCabinet AI score is ${$('scoreValue').textContent}/100.`;try{if(navigator.share)await navigator.share({title:'My MedCabinet AI Report',text});else{await navigator.clipboard.writeText(text);showToast('Report copied')}}catch(e){if(e.name!=='AbortError')showToast('Sharing unavailable')}});
$('sendOtpBtn').addEventListener('click',sendOtp);
$('loginEmail').addEventListener('keydown',e=>{if(e.key==='Enter')sendOtp()});
$('verifyOtpBtn').addEventListener('click',verifyOtp);
$('loginCode').addEventListener('keydown',e=>{if(e.key==='Enter')verifyOtp()});
$('resendOtpBtn').addEventListener('click',async()=>{$('loginEmail').value=pendingLoginEmail;await sendOtp()});
$('changeEmailBtn').addEventListener('click',()=>{$('loginStepCode').hidden=true;$('loginStepEmail').hidden=false;$('loginCode').value='';$('loginSubtitle').textContent="Enter your email — we'll send a 6-digit code, no password needed."});
$('signOutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});
sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){showLoginScreen()}});

initApp();
