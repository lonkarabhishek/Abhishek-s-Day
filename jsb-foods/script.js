/* ============================================================
   JSB Foods — motion + scroll
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
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ---------- GSAP setup ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* ---------- HERO title reveal ---------- */
    gsap.from('.hero-title .line', {
      yPercent: 110,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.12,
      delay: 0.2,
    });
    gsap.from('.hero .eyebrow, .hero-sub, .hero-cta, .scroll-cue', {
      opacity: 0,
      y: 30,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.1,
      delay: 0.9,
    });

    /* ---------- Generic reveal on scroll ---------- */
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.closest('.hero')) return; // hero handles itself
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => el.classList.add('is-in'),
      });
    });

    /* ---------- THE POP — the signature scrollytell ---------- */
    const popStage = document.querySelector('.pop-stage');
    if (popStage) {
      const burstEls = document.querySelectorAll('.burst span');
      // arrange burst particles around a circle
      burstEls.forEach((el, i) => {
        const angle = (i / burstEls.length) * Math.PI * 2;
        el.dataset.angle = angle;
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.pop-section',
          start: 'top top',
          end: '+=2400',
          scrub: 1,
          pin: '.pop-sticky',
          anticipatePin: 1,
        },
      });

      // Stage 1: raw seed sits, we introduce it (0 - 0.15)
      tl.fromTo(
        '.seed',
        { scale: 0.6, opacity: 0, rotate: -8 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.15, ease: 'power2.out' },
        0
      );
      tl.fromTo(
        '.step-1',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.1 },
        0.02
      );
      tl.to('.step-1', { opacity: 0, y: -20, duration: 0.08 }, 0.28);

      // Stage 2: heat rises, seed wobbles (0.15 - 0.4)
      tl.fromTo('.heat', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.15 }, 0.18);
      tl.to('.seed', {
        keyframes: [
          { scale: 1.02, rotate: 2, duration: 0.05 },
          { scale: 0.98, rotate: -2, duration: 0.05 },
          { scale: 1.05, rotate: 3, duration: 0.05 },
          { scale: 0.95, rotate: -3, duration: 0.05 },
          { scale: 1.1, rotate: 0, duration: 0.05 },
        ],
        ease: 'sine.inOut',
      }, 0.2);
      tl.fromTo(
        '.step-2',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.08 },
        0.3
      );
      tl.to('.step-2', { opacity: 0, y: -20, duration: 0.06 }, 0.52);

      // Stage 3: THE POP! (0.55)
      tl.to('.seed', {
        scale: 1.6,
        opacity: 0,
        filter: 'blur(6px)',
        duration: 0.05,
        ease: 'power4.in',
      }, 0.55);

      tl.fromTo(
        '.pop-makhana',
        { scale: 0.2, opacity: 0, rotate: -20 },
        { scale: 1.15, opacity: 1, rotate: 0, duration: 0.12, ease: 'back.out(2.2)' },
        0.56
      );
      tl.to('.pop-makhana', { scale: 1, duration: 0.06, ease: 'power2.out' }, 0.68);

      tl.fromTo(
        '.step-3',
        { opacity: 0, y: 40, scale: 0.7 },
        { opacity: 1, y: 0, scale: 1, duration: 0.1, ease: 'back.out(2)' },
        0.56
      );
      tl.to('.step-3', { opacity: 0, y: -30, duration: 0.06 }, 0.74);

      // Burst particles fly out
      burstEls.forEach((el) => {
        const angle = parseFloat(el.dataset.angle);
        const distance = 180 + Math.random() * 120;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        tl.fromTo(
          el,
          { x: 0, y: 0, scale: 0, opacity: 0 },
          {
            x, y,
            scale: 0.6 + Math.random() * 0.8,
            opacity: 1,
            duration: 0.15,
            ease: 'power2.out',
          },
          0.56
        ).to(el, { opacity: 0, scale: 0.3, duration: 0.15, ease: 'power2.in' }, 0.75);
      });

      // Stage 4: settle, show product name (0.75 - 1)
      tl.fromTo(
        '.step-4',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.1 },
        0.78
      );

      tl.to('.pop-makhana', {
        y: -30,
        rotate: 6,
        duration: 0.22,
        ease: 'power2.inOut',
      }, 0.78);
      tl.to('.pop-makhana', {
        y: 0,
        rotate: 0,
        duration: 0.22,
        ease: 'power2.inOut',
      }, 1);
    }

    /* ---------- PRODUCT pouch parallax ---------- */
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
    // orbit makhana around pouch
    gsap.utils.toArray('.orbit').forEach((el, i) => {
      gsap.to(el, {
        y: (i % 2 === 0 ? -60 : 40),
        x: (i % 2 === 0 ? 20 : -30),
        rotate: (i % 2 === 0 ? 90 : -60),
        ease: 'none',
        scrollTrigger: {
          trigger: '.product-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1 + i * 0.3,
        },
      });
    });

    /* ---------- ORIGIN parallax layers ---------- */
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

    /* ---------- WHY cards subtle stagger ---------- */
    gsap.from('.why-card', {
      y: 40,
      opacity: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.why-grid', start: 'top 80%' },
    });

    /* ---------- Nav background solid on scroll ---------- */
    ScrollTrigger.create({
      start: 'top -60',
      onUpdate: (self) => {
        document.querySelector('.site-nav').classList.toggle('is-scrolled', self.scroll() > 60);
      },
    });
  } else {
    // fallback if GSAP fails to load
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.querySelector('.scroll-progress');
  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Cursor blob (desktop) ---------- */
  const blob = document.querySelector('.cursor-blob');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (blob && canHover) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      blob.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    loop();

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
  status.textContent = '✨ You\'re on the list. We\'ll drop a line as soon as माKhana ships.';
  input.value = '';
  return false;
}
