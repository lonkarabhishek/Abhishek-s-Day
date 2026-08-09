/* ============================================================
   JSB Foods — motion + scroll orchestration.
   ============================================================ */

(function () {
  document.documentElement.classList.remove('no-js');
  document.getElementById('year').textContent = new Date().getFullYear();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis smooth scroll ---------- */
  let lenis;
  if (window.Lenis && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    (function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    })();
  }

  /* ============================================================
     HERO STORY — scroll-driven image sequence.
     ============================================================ */
  const storySection = document.querySelector('.hero-story');
  const canvas = document.querySelector('.hero-story__canvas');
  const captionsHost = document.querySelector('.hero-story__captions');
  const captions = captionsHost ? Array.from(captionsHost.querySelectorAll('.cap')) : [];
  const cue = document.querySelector('.hero-story__cue');
  const loadingEl = document.querySelector('[data-loading]');

  // Kick off image-sequence preload immediately; wire the ScrollTrigger
  // once GSAP is confirmed available and priority frames are decoded.
  let sequence = null;
  const FRAME_COUNT = 120;
  const FRAME_PATH = (i) =>
    `./public/sequence/makhana/frame-${String(i + 1).padStart(3, '0')}.webp`;

  function initSequence() {
    if (!canvas || !window.ImageSequence) return null;
    if (loadingEl) loadingEl.classList.add('is-visible');
    sequence = new ImageSequence(canvas, {
      count: FRAME_COUNT,
      pathFn: FRAME_PATH,
      priority: [0, 20, 40, 60, 78, 90, 105, FRAME_COUNT - 1],
      concurrency: 4,
    });
    sequence.preloadPriority().then(() => {
      if (loadingEl) loadingEl.classList.remove('is-visible');
      sequence.setProgress(0);          // paint the opening frame
      sequence.preloadRest();            // continue in background
    });
    return sequence;
  }
  initSequence();

  /* ---------- GSAP setup ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* -------- The pinned image sequence -------- */
    if (storySection && sequence) {
      ScrollTrigger.create({
        trigger: storySection,
        start: 'top top',
        end: 'bottom bottom',
        // No `pin` needed — the sticky child pins itself via CSS.
        // We just want a progress signal 0..1 across the section length.
        scrub: prefersReduced ? true : 0.5, // small scrub for smoothness
        onUpdate: (self) => {
          sequence.setProgress(self.progress);
          updateCaptions(self.progress);
          if (self.progress > 0.02 && cue) cue.classList.add('is-hidden');
        },
      });
    } else if (captions.length) {
      // No sequence → show the final line at least, so section isn't empty.
      captions[captions.length - 1].style.opacity = 1;
    }

    /* -------- Reveal on scroll for DOM sections -------- */
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => el.classList.add('is-in'),
      });
    });

    /* -------- Product pouch parallax -------- */
    gsap.to('.pouch', {
      y: -40,
      rotate: 2,
      ease: 'none',
      scrollTrigger: {
        trigger: '.product-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
    gsap.utils.toArray('.orbit').forEach((el, i) => {
      gsap.to(el, {
        y: i % 2 === 0 ? -60 : 40,
        x: i % 2 === 0 ? 20 : -30,
        rotate: i % 2 === 0 ? 90 : -60,
        ease: 'none',
        scrollTrigger: {
          trigger: '.product-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1 + i * 0.3,
        },
      });
    });

    /* -------- Origin parallax layers -------- */
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const depth = parseFloat(el.dataset.parallax || 0.3);
      gsap.fromTo(
        el,
        { yPercent: 0 },
        {
          yPercent: -30 * depth,
          ease: 'none',
          scrollTrigger: {
            trigger: '.origin-section',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    });

    /* -------- Why cards subtle stagger -------- */
    gsap.from('.why-card', {
      y: 40,
      opacity: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.why-grid', start: 'top 80%' },
    });

    /* -------- Nav background solid on scroll -------- */
    ScrollTrigger.create({
      start: 'top -60',
      onUpdate: (self) => {
        document
          .querySelector('.site-nav')
          .classList.toggle('is-scrolled', self.scroll() > 60);
      },
    });
  } else {
    // GSAP failed → show DOM content unconditionally and paint last frame.
    document
      .querySelectorAll('[data-reveal]')
      .forEach((el) => el.classList.add('is-in'));
    if (sequence) sequence.setProgress(1);
    if (captions.length) captions[captions.length - 1].style.opacity = 1;
  }

  /* ---------- Caption crossfade tied to sequence progress ---------- */
  function updateCaptions(p) {
    for (const el of captions) {
      const inAt = parseFloat(el.dataset.capIn);
      const outAt = parseFloat(el.dataset.capOut);
      // ease-in over 8% of scroll, ease-out over 8%
      const fade = 0.06;
      let opacity = 0;
      let y = 20;
      if (p >= inAt && p <= outAt) {
        const inFade = Math.min(1, (p - inAt) / fade);
        const outFade = Math.min(1, (outAt - p) / fade);
        opacity = Math.min(inFade, outFade);
        y = 20 * (1 - inFade); // slide up as it fades in
      }
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translateY(${y.toFixed(1)}px)`;
    }
  }
  // paint initial caption state
  updateCaptions(0);

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.querySelector('.scroll-progress');
  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Cursor blob (desktop) ---------- */
  const blob = document.querySelector('.cursor-blob');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (blob && canHover) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
    });
    (function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      blob.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll('a, button, .btn').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        blob.style.width = '48px';
        blob.style.height = '48px';
      });
      el.addEventListener('mouseleave', () => {
        blob.style.width = '22px';
        blob.style.height = '22px';
      });
    });
  }

  /* ---------- Smooth-scroll anchor clicks (Lenis-aware) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -60 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ---------- Subscribe form (front-end only) ---------- */
function handleSubscribe(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const input = form.querySelector('input[type="email"]');
  const status = document.getElementById('formStatus');
  const email = (input.value || '').trim();
  if (!email) return false;
  status.textContent =
    "✨ You're on the list. We'll drop a line as soon as माKhana ships.";
  input.value = '';
  return false;
}
