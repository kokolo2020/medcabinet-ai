const symbols={THB:'฿',USD:'$',EUR:'€',GBP:'£',SGD:'S$',KHR:'៛',JPY:'¥'};
const cfg=window.MEDCABINET_CONFIG;
const apiUrl=`${cfg.supabaseUrl}/rest/v1/medicines`;
const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`,'Content-Type':'application/json'};
const currencyBtn=document.getElementById('currencyBtn');
const currencyDialog=document.getElementById('currencyDialog');
const currencySelect