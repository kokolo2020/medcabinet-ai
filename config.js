window.MEDCABINET_CONFIG = {
  supabaseUrl: 'https://cdjkpwvxlrtnsftfbiew.supabase.co',
  supabaseKey: 'sb_publishable_AI_74SXuCbwYQG5T4H5OUA_VmfDxVbd'
};

(function loadPremiumCabinetStyles(){
  if(document.querySelector('link[data-premium-cabinet]')) return;
  var link=document.createElement('link');
  link.rel='stylesheet';
  link.href='premium-cabinet.css?v=3';
  link.setAttribute('data-prem