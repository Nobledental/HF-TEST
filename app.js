/* ===============================================
   HealthFlo — Subpath-safe SPA + Advanced UX
   =============================================== */

function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const prefersReduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const resolveURL = (p) => new URL(p, document.baseURI).href;
const cacheBust = () => `?v=${Date.now()}`;

/* ---------- Includes ---------- */
async function loadIncludes() {
  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all([...nodes].map(async (n) => {
    const rel = n.getAttribute('data-include'); // relative!
    const url = resolveURL(rel) + cacheBust();
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

/* ---------- Routes ---------- */
const routes = {
  '/home':     'views/landing.html',
  '/patient':  'views/patient.html',
  '/hospital': 'views/hospital.html',
  '/insurer':  'views/insurer.html'
};
const routeURL = (path) => resolveURL(routes[path] || routes['/home']) + cacheBust();

/* ---------- Router ---------- */
async function render(path) {
  const app = document.getElementById('app');
  const url = routeURL(path);

  if (!prefersReduced()) { app.classList.add('fade-out'); await sleep(120); }

  let html = '';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error('[View load failed]', path, '→', url, err);
    html = `
      <section class="section panel">
        <header class="section-head">
          <h2>Page not found</h2>
          <p class="kicker">We couldn’t load <code>${url.replace(location.origin,'')}</code>.</p>
          <p><a class="btn btn-primary" href="#/home">Back to Home</a></p>
      </section>`;
  }

  app.innerHTML = html;

  if (!prefersReduced()) {
    app.classList.remove('fade-out');
    app.classList.add('fade-in');
    setTimeout(()=>app.classList.remove('fade-in'),200);
  }

  // Focus first heading
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

/* ---------- Header interactions ---------- */
function bindHeader() {
  // Mobile menu
  const toggles = document.querySelectorAll('.nav__toggle');
  toggles.forEach((toggle)=>{
    const menu = document.getElementById('nav-menu');
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if(menu) menu.dataset.open = (!expanded).toString();
    });
  });

  // Theme switch (right side)
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

/* ---------- Page interactions & FX ---------- */
function bindPageInteractions(){
  // Scroll reveal
  const animated = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window && animated.length){
    const ob = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.dataset.animate='in'; ob.unobserve(e.target);} });
    },{threshold:0.2});
    animated.forEach(el=>{ el.dataset.animate='out'; ob.observe(el); });
  } else {
    animated.forEach(el=>el.setAttribute('data-animate','in'));
  }

  // Typewriter
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

  // Blink sequence for audience cards: Patient → Hospital → Insurer
  const auds = document.querySelectorAll('.aud-card--blink');
  if (auds.length && !prefersReduced()){
    let idx = 0;
    const id = setInterval(()=>{
      auds.forEach((a,i)=>a.classList.toggle('is-on', i===idx));
      idx = (idx+1)%auds.length;
    }, 1500);
    window.addEventListener('hashchange', ()=>clearInterval(id), { once:true });
  } else {
    auds.forEach(a=>a.classList.add('is-on'));
  }

  // Hero sparkles canvas (no libs)
  const c = document.getElementById('hero-sparkles');
  if (c){
    const ctx = c.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let w, h, points = [];
    function resize(){
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * DPR; c.height = h * DPR; ctx.scale(DPR, DPR);
      points = Array.from({length: 90}, ()=>({
        x: Math.random()*w, y: Math.random()*h*0.8 + h*0.1,
        r: Math.random()*1.6 + .4, vx: (Math.random()-.5)*.15, vy:(Math.random()-.5)*.15, a: Math.random()
      }));
    }
    function draw(){
      ctx.clearRect(0,0,w,h);
      points.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.a += 0.02;
        if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>h) p.vy*=-1;
        const alpha = .25 + .25*Math.sin(p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(154,216,255,${alpha})`;
        ctx.fill();
      });
      if(!prefersReduced()) requestAnimationFrame(draw);
    }
    resize(); draw(); window.addEventListener('resize', resize);
  }

  // Enhance spotlight cards: ripple on hover
  document.querySelectorAll('.spot-card').forEach(card=>{
    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left; const y = e.clientY - r.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      card.style.background = `radial-gradient(300px 200px at var(--mx) var(--my), rgba(154,216,255,.14), transparent 60%), linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02))`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.background = `linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02))`;
    });
  });

  // Route helpers on CTA buttons
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const role = btn.getAttribute('data-nav');
      if (role) location.hash = `/${role}`;
    });
  });

  // Neon nav hover (bind after render too)
  document.querySelectorAll('.menu__links a').forEach(a=>{
    a.addEventListener('mouseenter', ()=>a.classList.add('neon'));
    a.addEventListener('mouseleave', ()=>a.classList.remove('neon'));
  });
}

/* Helpers */
function safeJSON(str, fallback){ try{ return JSON.parse(str||''); }catch{ return fallback; } }

/* Init */
ready(async ()=>{
  if (!location.hash || location.hash === '#') { location.hash = '/home'; }
  await loadIncludes();
  bindHeader();
  onRouteChange();
});
