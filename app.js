const symbols={THB:'฿',USD:'$',EUR:'€',GBP:'£',SGD:'S$',KHR:'៛',JPY:'¥'};
const currencyBtn=document.getElementById('currencyBtn');
const currencyDialog=document.getElementById('currencyDialog');
const currencySelect=document.getElementById('currencySelect');
const saveCurrencyBtn=document.getElementById('saveCurrencyBtn');
const scanDialog=document.getElementById('scanDialog');
const reportDialog=document.getElementById('reportDialog');
const toast=document.createElement('div');
toast.className='toast';document.body.appendChild(toast);

function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
function setGreeting(){const hour=new Date().getHours();const label=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';document.querySelector('.topbar .eyebrow').textContent=label}
function applyCurrency(code){const symbol=symbols[code]||code+' ';currencyBtn.textContent=symbol;document.getElementById('monthlySpend').textContent=`${symbol}3,850`;document.getElementById('reportValue').textContent=`${symbol}18,250`;localStorage.setItem('medcabinet_currency',code)}

setGreeting();
const savedCurrency=localStorage.getItem('medcabinet_currency')||'THB';currencySelect.value=savedCurrency;applyCurrency(savedCurrency);

currencyBtn.addEventListener('click',()=>currencyDialog.showModal());
saveCurrencyBtn.addEventListener('click',()=>{applyCurrency(currencySelect.value);showToast(`${currencySelect.options[currencySelect.selectedIndex].text} selected`)});
document.getElementById('mainScanBtn').addEventListener('click',()=>scanDialog.showModal());
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>scanDialog.showModal()));
document.getElementById('shareReportBtn').addEventListener('click',()=>reportDialog.showModal());

document.getElementById('nativeShareBtn').addEventListener('click',async()=>{
 const text='My MedCabinet AI score is 82/100. I am keeping my household medicine cabinet organized and safe.';
 try{if(navigator.share){await navigator.share({title:'My MedCabinet AI Report',text})}else{await navigator.clipboard.writeText(text);showToast('Report copied to clipboard')}}catch(error){if(error.name!=='AbortError')showToast('Sharing is not available on this device')}
});

document.querySelectorAll('.bottom-nav button:not(.scan-main)').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('.bottom-nav button').forEach(item=>item.classList.remove('active'));button.classList.add('active');
 if(button.querySelector('span')?.textContent!=='Home')showToast(`${button.querySelector('span').textContent} screen coming next`);
}));

document.querySelectorAll('.scan-options button').forEach(button=>button.addEventListener('click',()=>showToast(`${button.textContent.trim()} selected`)));
