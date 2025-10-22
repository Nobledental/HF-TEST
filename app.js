/* =========================================================
   HealthFlo App — SPA Router + Interactions (GH Pages safe)
   Resolves includes/views against document.baseURI (subpath-aware)
   ========================================================= */

function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const prefersReduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Safe URL resolver (handles /HF-TEST/ subpath) ---------- */
const resolveURL = (p) => new URL(p, document.baseURI).href;

/* ---------- Include loader (header/footer) ---------- */
async function loadIncludes() {
  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all([...nodes].map(async (n) => {
    const rel = n.getAttribute('data-include');            // e.g. "partials/header.html"
    const url = resolveURL(rel);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      n.outerHTML = await res.text();
    } catch (err) {
      console.error('Include failed:', rel, '→', url, err);
      n.outerHTML = `<div class="wrap" style="padding:1rem;border:1px dashed rgba(255,255,255,.2);border-radius:12px">
        <small>Failed to load include: <code>${rel}</code></small>
      </div>`;
    }
  }));
}

/* ---------- Routes (RELATIVE keys & resolved URLs) ---------- */
const routes = {
  '/home':     'views/landing.html',
  '/patient':  'views/patient.html',
  '/hospital': 'views/hospital.html',
  '/insurer':  'views/insurer.html'
};
const routeURL = (path) => resolveURL(routes[path] || routes['/home']);

/* ---------- Router ---------- */
async function render(path) {
  const app = document.getElementById('app');
  const url = routeURL(path);

  if (!prefersReduced()) { app.classList.add('fade-out'); await sleep(120); }

  let html = '';
  try {
    let res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      // gentle fallback: try case-variant "Landing.html" once (helps if OS created wrong case)
      if (path === '/home' && routes['/home'].toLowerCase().includes('landing.html')) {
        const alt = resolveURL('views/Landing.html');
        res = await fetch(alt, { cache: 'no-store' });
        if (res.ok) {
          html = await res.text();
        } else {
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
      } else {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
    } else {
      html = await res.text();
    }
  } catch (err) {
    console.error('View load failed:', path, url, err);
    html = `
      <section class="section panel">
        <header class="section-head">
          <h2>Page not found</h2>
          <p class="kicker">We couldn’t load <code>${url.replace(location.origin,'')}</code>.</p>
          <p>Quick checks:</p>
          <ul class="checklist">
            <li>File exists in <code>views/</code> on the published branch</li>
            <li>Exact name &amp; case: <code>${routes[path] || routes['/home']}</code></li>
            <li>GitHub Pages “Source” points to this folder</li>
          </ul>
        </header>
        <p><a class="btn btn-primary" href="#/home">Back to Home</a></p>
      </section>`;
  }

  app.innerHTML = html;

  if (!prefersReduced()) {
    app.classList.remove('fade-out');
    app.classList.add('fade-in');
    setTimeout(()=>app.classList.remove('fade-in'),200);
  }

  // Accessibility: focus first heading
  const firstH = app.querySelector('h1,h2,h3,[role="heading"]');
  if (firstH) firstH.setAttribute('tabindex','-1'), firstH.focus({ preventScroll: true });

  bindPageInteractions();
  closeMobileMenuOnNavigate();
  app.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
}

function onRouteChange(){
  const hash = location.hash.replace('#','') || '/home';
  render(hash);
}
window.addEventListener('hashchange', onRouteChange);

/* ---------- Header interactions (after includes) ---------- */
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
      const on = x.dataset.theme===active;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-pressed', on ? 'true':'false');
    });
  }

  // Neon dash hover
  document.querySelectorAll('.menu__links a').forEach(a=>{
    a.addEventListener('mouseenter', ()=>a.classList.add('neon'));
    a.addEventListener('mouseleave', ()=>a.classList.remove('neon'));
  });
}

function closeMobileMenuOnNavigate(){
  const menu = document.getElementById('nav-menu');
  const toggle = document.querySelector('.nav__toggle');
  if (!menu || !toggle) return;
  menu.querySelectorAll('a[href^="#/"]').forEach(a=>{
    a.addEventListener('click', ()=>{
      toggle.setAttribute('aria-expanded','false');
      menu.dataset.open = 'false';
    }, { once: true });
  });
}

/* ---------- Page interactions ---------- */
function bindPageInteractions(){
  // Intersection reveal
  const animated = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window && animated.length){
    const ob = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.dataset.animate='in'; ob.unobserve(e.target);} });
    },{threshold:0.2});
    animated.forEach(el=>{ el.dataset.animate='out'; ob.observe(el); });
  } else {
    animated.forEach(el=>el.setAttribute('data-animate','in'));
  }

  // Typewriter headline
  const tw = document.querySelector('.typewriter');
  if(tw){
    const lines = safeJSON(tw.dataset.rotate, []);
    if (lines.length){
      let i=0;
      const tick = ()=>{
        tw.classList.remove('typing'); void tw.offsetWidth;
        tw.textContent = lines[i];
        tw.classList.add('typing');
        i = (i+1) % lines.length;
      };
      tick();
      const id = setInterval(tick, 3000);
      window.addEventListener('hashchange', ()=>clearInterval(id), { once:true });
    }
  }

  // Blink sequence for audience cards
  const auds = document.querySelectorAll('.aud-card--blink');
  if (auds.length && !prefersReduced()){
    let idx = 0;
    const id = setInterval(()=>{
      auds.forEach((a,i)=>a.classList.toggle('is-on', i===idx));
      idx = (idx+1)%auds.length;
    }, 1600);
    window.addEventListener('hashchange', ()=>clearInterval(id), { once:true });
  } else {
    auds.forEach(a=>a.classList.add('is-on'));
  }

  // Coverage mock
  const drop = document.getElementById('policy-drop');
  if(drop){
    const fileInput = document.getElementById('policy-file');
    const out = document.getElementById('coverage-results');
    const list = document.getElementById('coverage-checklist');
    const showMock = ()=>{
      if(out) out.hidden = false;
      if(list) list.innerHTML = `
        <li>Sum Insured: <strong>₹10,00,000</strong></li>
        <li>Room Rent: <strong>Single (no cap)</strong></li>
        <li>Co-pay: <strong>0%</strong> (up to age 55)</li>
        <li>Waiting periods: <strong>2 yrs</strong> (specified ailments)</li>
        <li>Pre/Post Hospitalization: <strong>30/60 days</strong></li>`;
    };
    drop.addEventListener('click', ()=>fileInput && fileInput.click());
    drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('dz--over'); });
    drop.addEventListener('dragleave', ()=>drop.classList.remove('dz--over'));
    drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('dz--over'); showMock(); });
    if(fileInput) fileInput.addEventListener('change', showMock);
  }

  // ROI calculator (static)
  const roiForm = document.getElementById('roi-form');
  if(roiForm){
    roiForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(roiForm).entries());
      const claims = +data.claims || 0;
      const bill   = +data.bill   || 0;
      const denial = +data.denial || 14;
      const improvedDenial = Math.max(denial - 7, 1);
      const extra = Math.round(claims * bill * ((denial - improvedDenial)/100) * 3);
      const cashEl = document.getElementById('roi-cashin');
      const denEl  = document.getElementById('roi-denial');
      if (cashEl) cashEl.textContent = `₹${extra.toLocaleString('en-IN')}`;
      if (denEl)  denEl.textContent  = `${denial}% → ${improvedDenial}%`;
    });
  }

  // Neon dash hover (re-bind after render)
  document.querySelectorAll('.menu__links a').forEach(a=>{
    a.addEventListener('mouseenter', ()=>a.classList.add('neon'));
    a.addEventListener('mouseleave', ()=>a.classList.remove('neon'));
  });
}

/* ---------- Helpers ---------- */
function safeJSON(str, fallback){ try{ return JSON.parse(str||''); }catch{ return fallback; }}

/* ---------- App init ---------- */
ready(async ()=>{
  if (!location.hash || location.hash === '#') { location.hash = '/home'; }
  await loadIncludes();
  bindHeader();
  onRouteChange();
});
