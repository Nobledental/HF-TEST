/* =========================
   HealthFlo — Futuristic Landing v2 interactions
   ========================= */

(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    /* Apply saved theme immediately */
    const savedTheme = localStorage.getItem('hf.theme');
    if (savedTheme) {
      body.classList.remove('theme-cosmos','theme-care','theme-neon','theme-dawn');
      body.classList.add(savedTheme);
    }

    /* NAV TOGGLE */
    const toggler = qs('.nav__toggle');
    const menu = qs('#nav-menu');
    if (toggler && menu) {
      const links = qsa('a', menu);
      toggler.addEventListener('click', () => {
        const open = toggler.getAttribute('aria-expanded') === 'true';
        toggler.setAttribute('aria-expanded', String(!open));
        menu.dataset.open = (!open).toString();
        if (!open) {
          document.addEventListener('keydown', trap, { once: false });
        } else {
          document.removeEventListener('keydown', trap);
        }
      });

      const trap = (e) => {
        if (e.key === 'Escape') {
          toggler.setAttribute('aria-expanded','false');
          delete menu.dataset.open;
          document.removeEventListener('keydown', trap);
          toggler.focus();
        }
        if (e.key !== 'Tab') return;
        const focusables = links.filter(el => !el.hasAttribute('disabled'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      links.forEach(link => link.addEventListener('click', () => {
        toggler.setAttribute('aria-expanded','false');
        delete menu.dataset.open;
        document.removeEventListener('keydown', trap);
      }));
    }

    /* THEME SWITCHER */
    const themeBtns = qsa('.theme-switch .pill');
    const currentTheme = savedTheme || 'theme-cosmos';
    themeBtns.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.theme === currentTheme);
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        themeBtns.forEach(b=>b.classList.toggle('is-active', b === btn));
        body.classList.remove('theme-cosmos','theme-care','theme-neon','theme-dawn');
        body.classList.add(theme);
        localStorage.setItem('hf.theme', theme);
      });
    });

    /* SCROLL REVEAL */
    const animated = qsa('[data-animate]');
    if ('IntersectionObserver' in window && animated.length) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-animate','in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      animated.forEach(el => io.observe(el));
    } else {
      animated.forEach(el => el.setAttribute('data-animate','in'));
    }

    /* TYPED LINE */
    const typed = qs('.typed');
    if (typed) {
      const lines = [
        'We connect hospitals, patients, and insurers so cashless care just works.',
        'Compare policies, explore packages, and book care with confidence.',
        'Hospitals get faster approvals and predictable cash-in.'
      ];
      let index = 0;
      let pos = 0;
      let back = false;
      const caret = qs('.typed-caret');

      const tick = () => {
        const text = lines[index];
        typed.textContent = back ? text.slice(0, pos--) : text.slice(0, pos++);
        if (!back && pos > text.length + 6) { back = true; }
        if (back && pos <= 0) {
          back = false;
          index = (index + 1) % lines.length;
        }
        const delay = back ? 28 : 46;
        timeout = window.setTimeout(tick, delay);
      };
      let timeout;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        tick();
      } else {
        typed.textContent = lines[0];
        if (caret) caret.style.display = 'none';
      }
    }

    /* COUNT UP METRICS */
    const counters = qsa('[data-count]');
    if (counters.length) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          io.unobserve(el);
          const target = parseFloat(el.dataset.count || '0');
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const suffix = el.dataset.suffix || '';
          const duration = parseInt(el.dataset.duration || '1200', 10);
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = progress === 1 ? target : target * eased;
            el.textContent = value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.4 });
      counters.forEach(el => io.observe(el));
    }

    /* BLINK SEQUENCE */
    const chooseCards = [
      qs('.choose__card--patient'),
      qs('.choose__card--hospital'),
      qs('.choose__card--insurer')
    ].filter(Boolean);
    if (chooseCards.length) {
      let idx = 0;
      const loop = () => {
        if (body.dataset.mode !== 'intro') return;
        chooseCards.forEach((c,i)=>c.classList.toggle('blink', i === idx));
        idx = (idx + 1) % chooseCards.length;
        setTimeout(loop, 1400);
      };
      loop();

      chooseCards.forEach(card => {
        card.addEventListener('click', (e) => {
          const target = card.dataset.target;
          if (!target) return;
          body.dataset.mode = target;
          chooseCards.forEach(c=>c.classList.remove('blink'));
          card.classList.add('blink');
          const panelId = target === 'patient' ? '#patients' : target === 'hospital' ? '#hospitals' : '#insurers';
          const panels = ['#patients', '#hospitals', '#insurers'];
          panels.forEach(sel => {
            const el = qs(sel);
            if (!el) return;
            if (sel === panelId) {
              el.hidden = false;
            } else {
              el.hidden = true;
            }
          });
          const panel = qs(panelId);
          if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          e.preventDefault();
        });
      });
    }

    /* APPLE-LIKE SLIDER */
    qsa('[data-slider]').forEach(slider => {
      const track = qs('.slider__track', slider);
      const prev = qs('.slider__btn.prev', slider);
      const next = qs('.slider__btn.next', slider);
      if (!track) return;
      const scrollByCard = (dir) => {
        const card = qs('.slide', track);
        const width = card ? card.getBoundingClientRect().width : 320;
        track.scrollBy({ left: dir * (width + 14), behavior: 'smooth' });
      };
      prev?.addEventListener('click', () => scrollByCard(-1));
      next?.addEventListener('click', () => scrollByCard(1));
    });

    /* COVERAGE UPLOAD */
    const dropzone = qs('#policy-drop');
    const input = qs('#policy-file');
    const results = qs('#coverage-results');
    const list = qs('#coverage-checklist');
    if (dropzone && input && results && list) {
      const hints = (name) => [
        `Policy: ${name}`,
        'Sum insured: ₹5–20L (plan dependent)',
        'Room rent limit: ₹4,000/day (upgrade possible)',
        'Co-pay: None (< 55y); 10% (55+)',
        'Waiting: 1–3 yrs (PED typical 3 yrs)',
        'Day-care: 500+ procedures covered',
        'Common exclusions: Cosmetic, experimental, non-medical items'
      ];
      const show = (name) => {
        list.innerHTML = '';
        hints(name).forEach(text => {
          const item = document.createElement('li');
          item.textContent = text;
          list.appendChild(item);
        });
        results.hidden = false;
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      dropzone.addEventListener('click', () => input.click());
      ['dragover','dragenter'].forEach(ev => dropzone.addEventListener(ev, e => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--tone)';
      }));
      ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, () => {
        dropzone.style.borderColor = 'color-mix(in srgb, var(--tone) 35%, #DCE7FF)';
      }));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) show(file.name);
      });
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) show(file.name);
      });
    }

    /* ROI FORM */
    const roiForm = qs('#roi-form');
    if (roiForm) {
      const outCash = qs('#roi-cashin');
      const outDen = qs('#roi-denial');
      roiForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(roiForm);
        const claims = Number(data.get('claims')) || 0;
        const bill = Number(data.get('bill')) || 0;
        const denial = Number(data.get('denial')) || 0;
        const base = claims * bill;
        const newDenial = Math.max(denial * 0.45, 1);
        const denialDrop = Math.max(0, denial - newDenial);
        const recovered = base * (denial / 100) * 0.5;
        const speedGain = base * 0.03;
        const cashIn90 = Math.round((recovered + speedGain) / 3);
        if (outCash) outCash.textContent = '₹ ' + cashIn90.toLocaleString('en-IN');
        if (outDen) outDen.textContent = denialDrop.toFixed(1) + '%';
      });
    }

    /* CTA NAV BUTTONS */
    qsa('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        const card = qs(`.choose__card--${target}`);
        card?.click();
      });
    });

    /* AI GUIDE */
    qs('.aiguide')?.addEventListener('click', () => {
      alert('Hi! I can help you compare policies, estimate ROI, or find the right package. (Connect me to your chat engine later!)');
    });

    /* Footer year */
    const year = qs('#year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();
