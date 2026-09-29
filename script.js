(() => {
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#site-nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false')});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))}
const toast=document.querySelector('#toast');
document.querySelectorAll('.copy-prompt').forEach(button=>button.addEventListener('click',async()=>{const prompt=button.dataset.prompt||'';try{await navigator.clipboard.writeText(prompt)}catch{const t=document.createElement('textarea');t.value=prompt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}if(toast){toast.textContent='Prompt copiado. Ábrelo en ChatGPT y pégalo en el chat.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}}));
})();