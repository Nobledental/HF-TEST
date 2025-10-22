/* =========================================================
   HealthFlo — SPA Router + Pro UX (GitHub Pages friendly)
   v3.1
   ========================================================= */

/* --------------------
   small helpers
   -------------------- */
const qs  = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ready = (fn) => document.readyState !== 'loading'
  ? fn()
  : document.addEventListener('DOMContentLoaded', fn);
const prefersReduced = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const resolveURL = (p) => new URL(p, document.baseURI).href;
const cacheBust = () => (location.hostname === 'localhost' ? `?v=${Date.now()}` : '');

/* namespace for timeouts/raf/intervals we create each render */
const FX = {
  raf: new Set(),
  int: new Set(),
  tmo: new Set(),
  clearAll() {
    this.raf.forEach(cancelAnimationFrame); this.raf.clear();
    this.int.forEach(clearInterval);        this.int.clear();
    this.tmo.forEach(clearTimeout);         this.tmo.clear();
  }
};

/* --------------------
   Includes (partials)
   -------------------- */
async function loadIncludes() {
  const nodes = qsa('[data-include]');
  await Promise.all(nodes.map(async (n) => {
    const rel = n.getAttribute('data-include');         // relative path
    const url = resolveURL(rel) + cacheBust();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      n.outerHTML = await res.text();
    } catch (err) {
      console.error('Include failed:', rel, '→', url, err);
      n.outerHTML = `<div class="wrap" style="padding:1rem;border:1px dashed var(--line);border-radius:12px"><small>Failed to load include: <code>${rel}</code></small></div>`;
    }
  }));
}

/* --------------------
   Routes + view cache
   -------------------- */
const routes = {
  '/home'    : 'views/landing.html',
  '/patient' : 'views/patient.html',
  '/hospital': 'views/hospital.html',
  '/insurer' : 'views/insurer.html'
};
const VIEW_CACHE_KEY = 'hf.viewcache.v1';
const viewCache = JSON.parse(sessionStorage.getItem(VIEW_CACHE_KEY) || '{}');
function saveCache() { sessionStorage.setItem(VIEW_CACHE_KEY, JSON.stringify(viewCache)); }
const routeURL = (path) => resolveURL(routes[path] || routes['/home']) + cacheBust();

/* prefetch on hover/focus for snappy nav */
function installPrefetch() {
  qsa('a[href^="#/"]').forEach(a => {
    const path = a.getAttribute('href').slice(1);
    const url  = routeURL(path);
    const prefetch = async () => {
      if (viewCache[url]) return;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) { viewCache[url] = await res.text(); saveCache(); }
      } catch (_) {}
    };
    ['mouseenter','focusin','touchstart'].forEach(ev =>
      a.addEventListener(ev, prefetch, { passive: true, once: true })
    );
  });
}

/* --------------------
   Router
   -------------------- */
async function render(path) {
  const app = qs('#app');
  const url = routeURL(path);

  // transition out
  if (!prefersReduced()) { app.classList.add('fade-out'); await sleep(100); }

  // clear previous FX timers/raf
  FX.clearAll();

  // fetch with session cache fallback
  let html = viewCache[url] || '';
  if (!html) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
      viewCache[url] = html; saveCache();
    } catch (err) {
      console.error('[View load failed]', path, '→', url, err);
      html = `
        <section class="spotlights">
          <div class="spot-card" data-animate="in">
            <h3>We couldn’t load this page</h3>
            <p class="hero__sub">Tried: <code>${url.replace(location.origin,'')}</code></p>
            <div class="hero__cta-row"><a class="btn btn-primary" href="#/home">Back to Home</a></div>
          </div>
        </section>`;
    }
  }

  // inject
  app.innerHTML = html;

  // transition in
  if (!prefersReduced()) {
    app.classList.remove('fade-out');
    app.classList.add('fade-in');
    FX.tmo.add(setTimeout(() => app.classList.remove('fade-in'), 220));
  }

  // focus first heading for a11y
  const firstH = qs('h1,h2,h3,[role="heading"]', app);
  if (firstH) { firstH.setAttribute('tabindex','-1'); firstH.focus({ preventScroll: true }); }

  // bind FX + UI
  bindPageInteractions();
  closeMobileMenuOnNavigate();
  markActiveLink();
  installPrefetch();

  // scroll to top
  app.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
}

function onRouteChange() {
  const hash = (location.hash.replace('#','') || '/home').split('?')[0];
  render(hash);
}
window.addEventListener('hashchange', onRouteChange);

/* --------------------
   Global header UX
   -------------------- */
function bindHeader() {
  // Mobile menu toggle + focus trap
  const toggle = qs('.nav__toggle');
  const menu   = qs('#nav-menu');

  if (toggle && menu) {
    const trapFocus = (e) => {
      if (menu.dataset.open !== 'true') return;
      const focusables = qsa('a,button,summary,[tabindex]:not([tabindex="-1"])', menu)
        .filter(el => !el.hasAttribute('disabled'));
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === 'Escape') { collapseMenu(); toggle.focus(); }
    };
    const expandMenu = () => {
      toggle.setAttribute('aria-expanded','true'); menu.dataset.open = 'true';
      document.addEventListener('keydown', trapFocus);
    };
    const collapseMenu = () => {
      toggle.setAttribute('aria-expanded','false'); menu.dataset.open = 'false';
      document.removeEventListener('keydown', trapFocus);
    };

    toggle.addEventListener('click', () => {
      (menu.dataset.open === 'true') ? collapseMenu() : expandMenu();
    });

    // close submenu on outside click
    document.addEventListener('click', (e)=>{
      const dd = qs('details[data-submenu][open]'); if (dd && !dd.contains(e.target)) dd.removeAttribute('open');
    });
  }

  // Theme switching (adds Aurora & Sterile)
  const pills = qsa('.theme-switch .pill');
  const root  = document.body;
  const saved = localStorage.getItem('hf.theme');
  const defaultTheme = saved || root.className || 'theme-ocean';
  setTheme(defaultTheme);

  pills.forEach(p => p.addEventListener('click', () => setTheme(p.dataset.theme)));

  function setTheme(theme) {
    root.className = theme;
    localStorage.setItem('hf.theme', theme);
    // reflect UI state
    qsa('.theme-switch .pill').forEach(x => {
      const on = x.dataset.theme === theme;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-pressed', on ? 'true':'false');
    });
    // meta theme-color to tint status bars
    const meta = qs('meta[name="theme-color"]');
    if (meta) {
      const color =
        theme === 'theme-dawn'   ? '#f7f9fc' :
        theme === 'theme-sterile'? '#ffffff' :
        '#050816';
      meta.setAttribute('content', color);
    }
  }

  // Neon dash hover on top-level links
  qsa('.menu__links a').forEach(a=>{
    a.addEventListener('mouseenter', ()=>a.classList.add('neon'));
    a.addEventListener('mouseleave', ()=>a.classList.remove('neon'));
  });

  // shrink header on scroll (subtle)
  let lastY = 0;
  const header = qs('.site-header');
  if (header) {
    window.addEventListener('scroll', ()=>{
      const y = window.scrollY || 0;
      const shrink = y > 8 && y >= lastY;
      header.style.transform = shrink ? 'translateY(-4px)' : 'translateY(0)';
      header.style.boxShadow = shrink ? 'var(--shadow-2)' : 'var(--shadow-1)';
      lastY = y;
    }, { passive: true });
  }

  // ripple effect on CTAs
  qsa('[data-ripple]').forEach(btn=>{
    btn.addEventListener('click', function(e){
      const r = document.createElement('span');
      const d = Math.max(this.clientWidth, this.clientHeight);
      r.style.width = r.style.height = d + 'px';
      r.style.left = (e.offsetX - d/2) + 'px';
      r.style.top  = (e.offsetY - d/2) + 'px';
      r.className = 'ripple';
      this.appendChild(r);
      FX.tmo.add(setTimeout(()=>r.remove(), 600));
    });
  });
}

function closeMobileMenuOnNavigate(){
  const menu = qs('#nav-menu'); const toggle = qs('.nav__toggle');
  if (!menu || !toggle) return;
  qsa('#nav-menu a[href^="#/"]').forEach(a=>{
    a.addEventListener('click', ()=>{
      toggle.setAttribute('aria-expanded','false');
      menu.dataset.open = 'false';
    }, { once: true });
  });
}

/* --------------------
   Page interactions & FX
   -------------------- */
function bindPageInteractions(){
  /* scroll reveal */
  const animated = qsa('[data-animate]');
  if ('IntersectionObserver' in window && animated.length){
    const ob = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.dataset.animate='in'; ob.unobserve(e.target);} });
    },{threshold:0.2});
    animated.forEach(el=>{ el.dataset.animate = el.dataset.animate || 'out'; ob.observe(el); });
  } else {
    animated.forEach(el=> el.dataset.animate='in');
  }

  /* typewriter */
  const tw = qs('.typewriter');
  if (tw) {
    const lines = safeJSON(tw.dataset.rotate, []);
    if (lines.length) {
      let i = 0;
      const tick = () => {
        tw.classList.remove('typing'); void tw.offsetWidth; // reflow
        tw.textContent = lines[i];
        tw.classList.add('typing');
        i = (i + 1) % lines.length;
      };
      tick();
      const id = setInterval(tick, 3000);
      FX.int.add(id);
    }
  }

  /* blink sequence for audience cards (pause on hover/focus) */
  const auds = qsa('.aud-card--blink');
  if (auds.length) {
    let idx = 0, paused = false;
    const id = setInterval(()=>{
      if (!paused) {
        auds.forEach((a,i)=>a.classList.toggle('is-on', i===idx));
        idx = (idx+1)%auds.length;
      }
    }, 1500);
    FX.int.add(id);
    auds.forEach(a=>{
      ['mouseenter','focusin','touchstart'].forEach(ev => a.addEventListener(ev, ()=> paused = true));
      ['mouseleave','focusout'].forEach(ev => a.addEventListener(ev, ()=> paused = false));
    });
  }

  /* lightweight parallax */
  (() => {
    const layers = qsa('.hero .layer[data-depth]');
    if (!layers.length || prefersReduced()) return;
    let rx = 0, ry = 0, tx = 0, ty = 0;
    const lerp = (a,b,t)=>a+(b-a)*t;
    const onMove = (x,y) => { tx = (x / innerWidth - .5) * 2; ty = (y / innerHeight - .5) * 2; };
    const moveHandler = (e)=> onMove(e.clientX, e.clientY);
    const touchHandler = (e)=> { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); };
    window.addEventListener('mousemove', moveHandler, { passive: true });
    window.addEventListener('touchmove', touchHandler, { passive: true });
    const step = () => {
      rx = lerp(rx, tx, .06); ry = lerp(ry, ty, .06);
      layers.forEach(el=>{
        const d = parseFloat(el.dataset.depth || '0');
        el.style.transform = `translate3d(${(-rx*d)*12}px, ${(-ry*d)*12}px, 0)`;
      });
      const raf = requestAnimationFrame(step); FX.raf.add(raf);
    };
    step();
  })();

  /* sparkles canvas */
  (() => {
    const c = qs('#hero-sparkles'); if (!c || prefersReduced()) return;
    const ctx = c.getContext('2d', { alpha: true });
    const DPR = Math.min(2, devicePixelRatio || 1);
    function size(){ c.width = c.clientWidth * DPR; c.height = c.clientHeight * DPR; }
    size(); window.addEventListener('resize', size);
    const dots = Array.from({length: 90}, () => ({
      x: Math.random()*c.width, y: Math.random()*c.height, r: (Math.random()*1.5 + .6)*DPR,
      vx: (Math.random()-.5)*.25*DPR, vy: (Math.random()-.5)*.25*DPR, a: Math.random()*Math.PI*2
    }));
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      dots.forEach(d=>{
        d.x += d.vx; d.y += d.vy; d.a += 0.02;
        if (d.x < -20) d.x = c.width+20; else if (d.x > c.width+20) d.x = -20;
        if (d.y < -20) d.y = c.height+20; else if (d.y > c.height+20) d.y = -20;
        const alpha = .20 + .25*Math.sin(d.a);
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r*8);
        grad.addColorStop(0, `rgba(154,216,255,${alpha+.2})`);
        grad.addColorStop(1, `rgba(154,216,255,0)`);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
      });
      const raf = requestAnimationFrame(draw); FX.raf.add(raf);
    };
    draw();
  })();

  /* animated SVG strokes (connection schematic) */
  qsa('.hero__schematic svg path').forEach(path=>{
    try{
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      // trigger
      FX.tmo.add(setTimeout(()=>{ path.style.transition = 'stroke-dashoffset 1200ms var(--eio)'; path.style.strokeDashoffset = '0'; }, 40));
    }catch(_){}
  });

  /* 3D tilt on cards */
  const tilt = (el, max = 8) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const move = (e) => {
      const x = (e.clientX - cx) / (r.width/2);
      const y = (e.clientY - cy) / (r.height/2);
      el.style.transform = `perspective(700px) rotateX(${(-y*max)}deg) rotateY(${(x*max)}deg) translateZ(0)`;
    };
    const leave = () => el.style.transform = '';
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
  };
  qsa('.aud-card, .spot-card').forEach(el => tilt(el, 6));

  /* gradient pointer glow on spot-cards */
  qsa('.spot-card').forEach(card=>{
    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.background = `radial-gradient(240px 160px at ${x}px ${y}px, rgba(154,216,255,.16), transparent 60%), color-mix(in oklab, var(--panel) 86%, transparent)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.background = `color-mix(in oklab, var(--panel) 86%, transparent)`;
    });
  });

  /* CTA buttons with [data-nav="patient|hospital|insurer"] */
  qsa('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const role = btn.getAttribute('data-nav');
      if (role) location.hash = `/${role}`;
    });
  });
}

/* --------------------
   helpers
   -------------------- */
function safeJSON(str, fallback){ try{ return JSON.parse(str||''); }catch{ return fallback; } }

/* highlight current link in header */
function markActiveLink(){
  const current = (location.hash || '#/home').split('?')[0];
  qsa('[data-link]').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === current));
}

/* --------------------
   boot
   -------------------- */
ready(async ()=>{
  if (!location.hash || location.hash === '#') location.hash = '/home';
  await loadIncludes();
  bindHeader();
  installPrefetch();
  onRouteChange();
});
