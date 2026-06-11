(function () {
  'use strict';

  // Bail safely if any CDN script failed to load
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || typeof Lenis === 'undefined') {
    var heroInners = document.querySelectorAll('.hero-line-inner');
    for (var i = 0; i < heroInners.length; i++) {
      heroInners[i].style.transform = 'none';
    }
    return;
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // Show all content immediately; skip Lenis and all animations.
    // The early return also prevents fadeUp() from hiding elements with gsap.set().
    gsap.set('.hero-line-inner', { y: '0%' });
    gsap.set('.bio', { opacity: 1, y: 0 });
    // Stop autoplaying media too; CSS can't gate the autoplay attribute.
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
    return;
  }

  // ── Lenis smooth scroll ──
  // Initialized only when motion is allowed (after reduced-motion check)
  var lenis = new Lenis({
    duration: 1.2,
    // Exponential ease-out (smoother tail than CSS ease-out)
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    orientation: 'vertical',
    smoothWheel: true,
    autoRaf: false,
  });

  // Expose for hamburger menu integration (see inline script in index.html)
  window.lenis = lenis;

  // Sync Lenis with GSAP ScrollTrigger:
  // lenis.raf() expects milliseconds; GSAP ticker provides seconds.
  // lagSmoothing(0) prevents scroll stutter when Lenis controls position.
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  /**
   * Fade-up animation helper. No-ops if selector matches nothing.
   *
   * @param {string} selector  CSS selector for elements to animate
   * @param {string|null} triggerEl  ScrollTrigger trigger (defaults to first matched element)
   * @param {Object} [opts]
   * @param {string}  [opts.start='top 85%']  ScrollTrigger start position
   * @param {number}  [opts.stagger=0]        Delay between elements (seconds)
   * @param {number}  [opts.duration=0.6]     Animation duration (seconds)
   * @param {number}  [opts.y=24]             Initial Y offset (px)
   * @param {number}  [opts.delay=0]          Initial delay (seconds)
   * @param {boolean} [opts.onLoad=false]     Play immediately without ScrollTrigger
   * @param {boolean} [opts.each=false]       Create independent ScrollTrigger per element
   */
  function fadeUp(selector, triggerEl, opts) {
    var els = gsap.utils.toArray(selector);
    if (!els.length) return;
    var trigger = triggerEl || els[0];
    var o = Object.assign({
      start: 'top 85%',
      stagger: 0,
      duration: 0.6,
      y: 24,
      delay: 0,
      onLoad: false,
      each: false,
    }, opts);

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

  // ══════════════════════════════════════════════
  // STATEMENT PIECE 1: Hero line reveal (index.html)
  // ══════════════════════════════════════════════
  var heroLines = gsap.utils.toArray('.hero-line-inner');
  if (heroLines.length) {
    gsap.to(heroLines, {
      y: '0%',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.3,
    });

    gsap.set('.bio', { opacity: 0, y: 20 });
    gsap.to('.bio', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.9,
    });
  }

  /** Count an element up from 0 to its data-count value (suffix preserved). */
  function countUp(el, delay) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || '';
    el.textContent = '0';
    var obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.4,
      ease: 'power2.out',
      delay: delay || 0,
      onUpdate: function () {
        el.textContent = Math.round(obj.val) + suffix;
      },
    });
  }

  // ══════════════════════════════════════════════
  // STATEMENT PIECE 1b: Hero live-data card (index.html)
  // Card slides in after the bio, then the sparkline draws itself
  // while the stat numerals count up.
  // ══════════════════════════════════════════════
  var heroCard = document.querySelector('.hero-card');
  if (heroCard) {
    gsap.set(heroCard, { opacity: 0, y: 26 });
    gsap.to(heroCard, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 1.05,
      onStart: function () {
        heroCard.querySelectorAll('.hero-card-stat .v[data-count]').forEach(function (el, i) {
          countUp(el, 0.15 + i * 0.1);
        });

        var line = heroCard.querySelector('.spark-line');
        if (line && line.getTotalLength) {
          var len = line.getTotalLength();
          gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(line, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', delay: 0.2 });
        }
        var area = heroCard.querySelector('.spark-area');
        if (area) {
          gsap.set(area, { opacity: 0 });
          gsap.to(area, { opacity: 1, duration: 0.8, delay: 1.1 });
        }
        var dots = heroCard.querySelectorAll('.spark-dot');
        if (dots.length) {
          gsap.set(dots, { scale: 0, transformOrigin: 'center' });
          gsap.to(dots, { scale: 1, duration: 0.35, ease: 'back.out(2)', stagger: 0.12, delay: 0.45 });
        }
        var peak = heroCard.querySelector('.spark-peak-label');
        if (peak) {
          gsap.set(peak, { opacity: 0 });
          gsap.to(peak, { opacity: 1, duration: 0.4, delay: 1.2 });
        }
      },
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

    var countEls = document.querySelectorAll('[data-count]');
    if (countEls.length) {
      ScrollTrigger.create({
        trigger: '.contrib-stats',
        start: 'top 80%',
        once: true,
        onEnter: function () {
          countEls.forEach(function (el) {
            var target = parseInt(el.dataset.count, 10);
            if (isNaN(target)) return;
            var suffix = el.dataset.suffix || '';
            el.textContent = '0';
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
  fadeUp('.section-header', null, { start: 'top 88%', y: 20, each: true });
  fadeUp('.contrib-repos-label', null, { start: 'top 90%', y: 12 });
  fadeUp('.recent-pr-item', '.recent-prs-list', { start: 'top 82%', stagger: 0.08, y: 16 });
  fadeUp('.oss-card', null, { each: true, stagger: 0.1, duration: 0.7 });

  // Testimonial teaser: timeline pairs each quote with its attribution
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

  fadeUp('.work-with-me-cta', null, { y: 20 });

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

  // PR list items: batched in groups of 10 for staggered reveal
  // without creating excessive ScrollTrigger instances
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
  fadeUp('.testimonial-card', null, { each: true, stagger: 0.15, duration: 0.7 });
})();
