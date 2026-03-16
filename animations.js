(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Lenis smooth scroll ──
  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    orientation: 'vertical',
    smoothWheel: true,
    autoRaf: false,
  });

  // Expose for hamburger menu integration
  window.lenis = lenis;

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ── Helper: fade-up animation ──
  function fadeUp(selector, triggerEl, opts) {
    var els = gsap.utils.toArray(selector);
    if (!els.length) return;
    var trigger = triggerEl || els[0];
    var defaults = {
      start: 'top 85%',
      stagger: 0,
      duration: 0.6,
      y: 24,
      delay: 0,
      onLoad: false,
    };
    var o = {};
    for (var k in defaults) o[k] = defaults[k];
    if (opts) for (var k in opts) o[k] = opts[k];

    gsap.set(els, { opacity: 0, y: o.y });

    var animProps = {
      opacity: 1,
      y: 0,
      duration: o.duration,
      ease: 'power2.out',
      stagger: o.stagger,
      delay: o.delay,
    };

    if (o.onLoad) {
      gsap.to(els, animProps);
    } else if (o.each) {
      // Each element gets its own ScrollTrigger
      els.forEach(function (el, i) {
        gsap.to(el, Object.assign({}, animProps, {
          delay: i * (o.stagger || 0),
          stagger: 0,
          scrollTrigger: {
            trigger: el,
            start: o.start,
            once: true,
          },
        }));
      });
    } else {
      animProps.scrollTrigger = {
        trigger: trigger,
        start: o.start,
        once: true,
      };
      gsap.to(els, animProps);
    }
  }

  if (prefersReduced) {
    // ── Reduced motion: show everything immediately ──
    gsap.set('.hero-line-inner', { y: '0%' });
    gsap.set('.bio', { opacity: 1, y: 0 });
    // Stats: leave real numbers visible (no count-up)
    return;
  }

  // ══════════════════════════════════════════════
  // STATEMENT PIECE 1: Hero line reveal (index.html)
  // ══════════════════════════════════════════════
  var heroLines = gsap.utils.toArray('.hero-line-inner');
  if (heroLines.length) {
    gsap.to('.hero-line-inner', {
      y: '0%',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.3,
    });

    // Bio fades up after hero
    gsap.set('.bio', { opacity: 0, y: 20 });
    gsap.to('.bio', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.9,
    });
  }

  // ══════════════════════════════════════════════
  // STATEMENT PIECE 2: Stats count-up (index.html)
  // ══════════════════════════════════════════════
  var statCards = gsap.utils.toArray('.contrib-stat');
  if (statCards.length) {
    gsap.set(statCards, { opacity: 0, scale: 0.95 });

    gsap.to(statCards, {
      scrollTrigger: {
        trigger: '.contrib-stats',
        start: 'top 80%',
        once: true,
      },
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: 'back.out(1.4)',
      stagger: 0.1,
    });

    // Count-up
    var countEls = document.querySelectorAll('[data-count]');
    if (countEls.length) {
      // Replace text with 0 before animation
      countEls.forEach(function (el) {
        el.textContent = '0';
      });

      ScrollTrigger.create({
        trigger: '.contrib-stats',
        start: 'top 80%',
        once: true,
        onEnter: function () {
          countEls.forEach(function (el) {
            var target = parseInt(el.dataset.count);
            var suffix = el.dataset.suffix || '';
            var obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.5,
              ease: 'power2.out',
              delay: 0.3,
              onUpdate: function () {
                el.textContent = Math.round(obj.val) + suffix;
              },
            });
          });
        },
      });
    }
  }

  // ══════════════════════════════════════════════
  // STATEMENT PIECE 3: Repo chip cascade (index.html)
  // ══════════════════════════════════════════════
  var repoChips = gsap.utils.toArray('.repo-chip');
  if (repoChips.length) {
    gsap.set(repoChips, { opacity: 0, y: 20 });
    gsap.to(repoChips, {
      scrollTrigger: {
        trigger: '.repo-grid',
        start: 'top 82%',
        once: true,
      },
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: {
        amount: 0.5,
        grid: 'auto',
        from: 'start',
      },
    });
  }

  // ══════════════════════════════════════════════
  // STANDARD ANIMATIONS: index.html
  // ══════════════════════════════════════════════
  fadeUp('.value-card', '.values', { stagger: 0.12, y: 30 });
  fadeUp('.section-header', null, { start: 'top 88%', y: 20, each: true });
  fadeUp('.contrib-repos-label', null, { start: 'top 90%', y: 12 });
  fadeUp('.recent-pr-item', '.recent-prs-list', { start: 'top 82%', stagger: 0.08, y: 16 });
  fadeUp('.my-projects-label', null, { start: 'top 90%' });

  // Project cards: each triggered independently
  gsap.utils.toArray('.oss-card').forEach(function (card, i) {
    gsap.set(card, { opacity: 0, y: 24 });
    gsap.to(card, {
      scrollTrigger: { trigger: card, start: 'top 85%', once: true },
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      delay: i * 0.1,
    });
  });

  fadeUp('.oss-ethos', null, { y: 20 });

  // Testimonial teaser (index.html)
  var teaserQuotes = gsap.utils.toArray('.testimonial-teaser blockquote');
  var teaserAttrs = gsap.utils.toArray('.testimonial-teaser-attr');
  teaserQuotes.forEach(function (quote, i) {
    gsap.set(quote, { opacity: 0, y: 16 });
    if (teaserAttrs[i]) gsap.set(teaserAttrs[i], { opacity: 0 });
    var tl = gsap.timeline({
      scrollTrigger: { trigger: quote, start: 'top 85%', once: true },
    });
    tl.to(quote, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
    if (teaserAttrs[i]) {
      tl.to(teaserAttrs[i], { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.3');
    }
  });

  fadeUp('.writing-item', '.writing-list', { start: 'top 82%', stagger: 0.08, y: 16 });

  // ══════════════════════════════════════════════
  // STANDARD ANIMATIONS: about.html
  // ══════════════════════════════════════════════
  fadeUp('.about-page h1', null, { onLoad: true, delay: 0.1 });
  fadeUp('.about-page p', null, { onLoad: true, stagger: 0.12, delay: 0.25 });

  // ══════════════════════════════════════════════
  // STANDARD ANIMATIONS: contributions.html
  // ══════════════════════════════════════════════
  fadeUp('.contributions-page .section-eyebrow', null, { onLoad: true, delay: 0.1 });
  fadeUp('.contributions-page h1', null, { onLoad: true, delay: 0.15 });
  fadeUp('.contributions-intro', null, { onLoad: true, delay: 0.25 });
  fadeUp('.contributions-stats', null, { onLoad: true, delay: 0.35 });

  // PR list items: batched scroll triggers (10 at a time)
  var prItems = gsap.utils.toArray('.pr-list-item');
  if (prItems.length) {
    gsap.set(prItems, { opacity: 0, y: 16 });
    var batchSize = 10;
    for (var i = 0; i < prItems.length; i += batchSize) {
      var batch = prItems.slice(i, i + batchSize);
      gsap.to(batch, {
        scrollTrigger: {
          trigger: batch[0],
          start: 'top 82%',
          once: true,
        },
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.04,
      });
    }
  }

  // ══════════════════════════════════════════════
  // STANDARD ANIMATIONS: testimonials.html
  // ══════════════════════════════════════════════
  fadeUp('.testimonials-page h1', null, { onLoad: true, delay: 0.1 });
  fadeUp('.testimonials-intro', null, { onLoad: true, delay: 0.25 });

  // Testimonial cards: each triggered on scroll
  gsap.utils.toArray('.testimonial-card').forEach(function (card, i) {
    gsap.set(card, { opacity: 0, y: 24 });
    gsap.to(card, {
      scrollTrigger: { trigger: card, start: 'top 85%', once: true },
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      delay: i * 0.15,
    });
  });
})();
