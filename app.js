/* ===== Include loader (header/footer) ===== */
async function loadIncludes() {
  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all([...nodes].map(async (n) => {
    const url = n.getAttribute('data-include');
    const res = await fetch(url);
    n.outerHTML = await res.text();
  }));
}
function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}

/* ===== Simple SPA Router ===== */
const routes = {
  '/home': '/views/landing.html',
  '/patient': '/views/patient.html',
  '/hospital': '/views/hospital.html',
  '/insurer': '/views/insurer.html'
};
async function render(path){
  const app = document.getElementById('app');
  const url = routes[path] || routes['/home'];
  const res = await fetch(url);
  const html = await res.text();

  // exit transition
  app.classList.add('fade-out');
  await new Promise(r=>setTimeout(r,120));
  app.innerHTML = html;
  app.scrollIntoView({behavior:'smooth', block:'start'});
  app.classList.remove('fade-out');
  app.classList.add('fade-in');
  setTimeout(()=>app.classList.remove('fade-in'),200);

  bindPageInteractions();
}
function onRouteChange(){
  const hash = location.hash.replace('#','') || '/home';
  render(hash);
}
window.addEventListener('hashchange', onRouteChange);

/* ===== Header interactions (after include) ===== */
function bindHeader() {
  // mobile menu
  const toggles = document.querySelectorAll('.nav__toggle');
  toggles.forEach((toggle)=>{
    const menu = document.getElementById('nav-menu');
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if(menu) menu.dataset.open = (!expanded).toString();
    });
  });

  // theme switch
  const pills = document.querySelectorAll('.theme-switch .pill');
  const root = document.body;
  const saved = localStorage.getItem('hf.theme');
  if(saved){ root.className = saved; updateThemeUI(saved); }
  pills.forEach(p=>{
    p.addEventListener('click', ()=>{
      const theme = p.dataset.theme;
      root.className = theme;
      localStorage.setItem('hf.theme', theme);
      updateThemeUI(theme);
    });
  });
  function updateThemeUI(active){
    document.querySelectorAll('.theme-switch .pill').forEach(x=>{
      x.classList.toggle('is-active', x.dataset.theme===active);
      x.setAttribute('aria-pressed', x.dataset.theme===active ? 'true':'false');
    });
  }
}

/* ===== Page-level interactions & animations ===== */
function bindPageInteractions(){
  // Intersection reveal
  const animated = document.querySelectorAll('[data-animate]');
  if('IntersectionObserver' in window && animated.length){
    const ob = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.dataset.animate='in'; ob.unobserve(e.target);} });
    },{threshold:0.2});
    animated.forEach(el=>{ el.dataset.animate='out'; ob.observe(el); });
  }

  // Typewriter
  const tw = document.querySelector('.typewriter');
  if(tw){
    const lines = JSON.parse(tw.dataset.rotate || '[]');
    let i=0;
    function cycle(){
      tw.classList.remove('typing'); // trigger reflow for restart
      void tw.offsetWidth;
      tw.textContent = lines[i];
      tw.classList.add('typing');
      i = (i+1) % lines.length;
    }
    cycle(); setInterval(cycle, 3000);
  }

  // Blink sequence for audience cards
  const auds = document.querySelectorAll('.aud-card--blink');
  if(auds.length){
    let idx = 0;
    setInterval(()=>{
      auds.forEach((a,i)=>a.classList.toggle('is-on', i===idx));
      idx = (idx+1)%auds.length;
    }, 1600);
  }

  // Policy coverage mock parse
  const drop = document.getElementById('policy-drop');
  if(drop){
    const fileInput = document.getElementById('policy-file');
    const out = document.getElementById('coverage-results');
    const list = document.getElementById('coverage-checklist');
    function showMock(){
      out.hidden = false;
      list.innerHTML = `
        <li>Sum Insured: <strong>₹10,00,000</strong></li>
        <li>Room Rent: <strong>Single (no cap)</strong></li>
        <li>Co-pay: <strong>0%</strong> (up to age 55)</li>
        <li>Waiting periods: <strong>2 yrs</strong> (specified ailments)</li>
        <li>Pre/Post Hospitalization: <strong>30/60 days</strong></li>`;
    }
    drop.addEventListener('click', ()=>fileInput.click());
    drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('dz--over'); });
    drop.addEventListener('dragleave', ()=>drop.classList.remove('dz--over'));
    drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('dz--over'); showMock(); });
    fileInput.addEventListener('change', showMock);
  }

  // ROI calculator (posts to stub or computes locally)
  const roiForm = document.getElementById('roi-form');
  if(roiForm){
    roiForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(roiForm).entries());
      const claims = +data.claims || 0;
      const bill = +data.bill || 0;
      const denial = +data.denial || 14;
      // simple gains model
      const improvedDenial = Math.max(denial - 7, 1);
      const extra = Math.round(claims * bill * ((denial - improvedDenial)/100) * 3); // 3 months
      document.getElementById('roi-cashin').textContent = `₹${extra.toLocaleString('en-IN')}`;
      document.getElementById('roi-denial').textContent = `${denial}% → ${improvedDenial}%`;
      // optional POST to backend stub
      try{
        fetch('/api/roi', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({claims,bill,denial,extra})});
      }catch(_){}
    });
  }

  // Neon dash hover (menu links)
  document.querySelectorAll('.menu__links a').forEach(a=>{
    a.addEventListener('mouseenter', ()=>a.classList.add('neon'));
    a.addEventListener('mouseleave', ()=>a.classList.remove('neon'));
  });
}

/* ===== App init ===== */
ready(async ()=>{
  await loadIncludes();
  bindHeader();
  if(!location.hash) location.hash = '/home';
  onRouteChange();
});
