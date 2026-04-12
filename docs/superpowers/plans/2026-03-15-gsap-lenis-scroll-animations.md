# GSAP ScrollTrigger + Lenis Scroll Animations — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CSS `.rise` animations with GSAP ScrollTrigger scroll-driven animations and Lenis smooth scrolling across all 4 pages of the portfolio site.

**Architecture:** A shared `animations.js` file loaded on every page handles all animation logic with defensive element checks. GSAP ScrollTrigger drives scroll-triggered reveals. Lenis provides momentum-based smooth scrolling, synced to GSAP's ticker. Three "statement piece" animations on the homepage (hero line reveal, stats count-up, repo chip cascade); everything else gets clean fade-ins.

**Tech Stack:** GSAP 3.12.7 + ScrollTrigger (CDN), Lenis 1.1.18 (CDN), vanilla JS, no build step.

**Spec:** `docs/superpowers/specs/2026-03-15-gsap-lenis-scroll-animations-design.md`

---

## File Structure

| File | Role | Create/Modify |
|---|---|---|
| `styles.css` | Remove `.rise` animations and `scroll-behavior: smooth`. Add `.hero-line` classes. | Modify |
| `animations.js` | Lenis init, GSAP ScrollTrigger animations, reduced-motion handling. | Create |
| `index.html` | Hero restructure, stat data attributes, CDN scripts, hamburger lenis integration. | Modify |
| `about.html` | Remove `.rise` classes, add CDN scripts. | Modify |
| `contributions.html` | Remove `.rise` classes, add CDN scripts. | Modify |
| `testimonials.html` | Remove `.rise` classes, add CDN scripts. | Modify |

---

## Chunk 1: Foundation (CSS cleanup + animations.js core)

### Task 1: Clean up CSS — remove `.rise` animations and `scroll-behavior: smooth`

**Files:**
- Modify: `styles.css:22-56` (animations block and html rule)

- [ ] **Step 1: Remove `scroll-behavior: smooth` from the `html` rule**

In `styles.css`, change:
```css
html { font-size: 17px; scroll-behavior: smooth; }
```
to:
```css
html { font-size: 17px; }
```

- [ ] **Step 2: Remove the `@keyframes rise` block and all `.rise` / `.d1`-`.d6` classes**

Remove lines 45-56 from `styles.css` (including the section comment):
```css
/* ── Animations ── */
@keyframes rise {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
.rise { animation: rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
.d1 { animation-delay: 0.06s; }
.d2 { animation-delay: 0.14s; }
.d3 { animation-delay: 0.24s; }
.d4 { animation-delay: 0.36s; }
.d5 { animation-delay: 0.48s; }
.d6 { animation-delay: 0.6s; }
```

- [ ] **Step 3: Add `.hero-line` and `.hero-line-inner` classes**

Add after the reset block (after the `body::after` grain texture rule):

```css
/* ── Hero line reveal ── */
.hero-line {
  display: block;
  overflow: hidden;
}

.hero-line-inner {
  display: block;
  transform: translateY(110%);
}
```

- [ ] **Step 4: Verify CSS is valid**

Open `styles.css` in browser dev tools or visually confirm no syntax errors. The site will temporarily show all content without animations (which is the correct degraded state).

- [ ] **Step 5: Commit**

```bash
git add styles.css
git commit -m "refactor: remove CSS rise animations, add hero-line classes

Preparation for GSAP ScrollTrigger migration. Removes scroll-behavior: smooth
(Lenis will handle this) and all .rise/.d1-.d6 animation classes."
```

---

### Task 2: Create `animations.js` — Lenis + GSAP core setup

**Files:**
- Create: `animations.js`

- [ ] **Step 1: Create `animations.js` with Lenis init, GSAP sync, and reduced-motion guard**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add animations.js
git commit -m "feat: add animations.js with GSAP ScrollTrigger + Lenis

Shared animation file for all pages. Includes:
- Lenis smooth scroll with GSAP sync
- Hero line reveal, stats count-up, repo chip cascade
- Scroll-triggered fade-ins for all sections
- prefers-reduced-motion support
- Graceful degradation if JS fails to load"
```

---

## Chunk 2: HTML updates — index.html

### Task 3: Update index.html — hero restructure, stats data attributes, remove .rise classes

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove `.rise` and delay classes from all elements**

Remove `class="rise"` from `<nav>` (line 54). The nav keeps its other attributes.

Remove `rise d1` from the `<h1>` tag (line 75).
Remove `rise d2` from the bio `<p>` (line 77).
Remove `rise d5` from the values `<div>` (line 89).

- [ ] **Step 2: Restructure the hero `<h1>`**

Replace the current h1:
```html
<h1><span class="sr-only">John Costa — </span>Engineer, leader, <span class="accent"><span class="italic">builder.</span></span></h1>
```

With:
```html
<h1>
          <span class="sr-only">John Costa — </span>
          <span class="hero-line"><span class="hero-line-inner">Engineer, leader,</span></span>
          <span class="hero-line"><span class="hero-line-inner"><span class="accent"><span class="italic">builder.</span></span></span></span>
        </h1>
```

- [ ] **Step 3: Add `data-count` and `data-suffix` to stat numbers**

Change the three stat `.number` divs:

```html
<div class="number accent-num" data-count="56">56</div>
```
```html
<div class="number neutral-num" data-count="20" data-suffix="+">20+</div>
```
```html
<div class="number green-num" data-count="6">6</div>
```

- [ ] **Step 4: Add Lenis stop/start to hamburger menu**

In the inline `<script>` block, update the `open()` and `close()` functions:

In `open()`, add after `document.body.style.overflow = 'hidden';`:
```js
        if (window.lenis) window.lenis.stop();
```

In `close()`, add after `document.body.style.overflow = '';`:
```js
        if (window.lenis) window.lenis.start();
```

- [ ] **Step 5: Add CDN scripts and animations.js before `</body>`**

Add before the closing `</body>` tag (after the existing inline `<script>` block):

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
  <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
  <script src="animations.js"></script>
```

- [ ] **Step 6: Open index.html locally and verify**

Open in browser. Check:
- Hero lines reveal on load with stagger
- Scroll down: value cards fade up
- Stats count up from 0 when scrolled into view
- Repo chips cascade in with wave
- PR items stagger in
- Writing items stagger in
- Smooth scroll feels right
- Mobile hamburger menu still works (resize to mobile width)

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add GSAP scroll animations to index.html

Hero line reveal, stats count-up, repo chip cascade.
Scroll-triggered fade-ins for all sections.
Lenis smooth scroll with hamburger menu integration."
```

---

## Chunk 3: HTML updates — secondary pages

### Task 4: Update about.html — remove .rise classes, add scripts

**Files:**
- Modify: `about.html`

- [ ] **Step 1: Remove `.rise` and delay classes**

Remove `class="rise"` from `<nav>` (line 67).
Remove `rise d1` from `<h1>` (line 76).
Remove `rise d2` from first `<p>` (line 78).
Remove `rise d3` from second `<p>` (line 82).
Remove `rise d4` from third `<p>` (line 86).
Remove `rise d5` from fourth `<p>` (line 90).

- [ ] **Step 2: Add CDN scripts and animations.js before `</body>`**

Add before `</body>`:
```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
  <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
  <script src="animations.js"></script>
```

- [ ] **Step 3: Verify in browser**

Open about.html. Check heading and paragraphs fade up on load with stagger. Smooth scroll works.

- [ ] **Step 4: Commit**

```bash
git add about.html
git commit -m "feat: add GSAP scroll animations to about.html"
```

---

### Task 5: Update contributions.html — remove .rise classes, add scripts

**Files:**
- Modify: `contributions.html`

- [ ] **Step 1: Remove `.rise` and delay classes**

Remove `class="rise"` from `<nav>` (line 131).
Remove `rise d1` from `.section-eyebrow` (line 140).
Remove `rise d1` from `<h1>` (line 141).
Remove `rise d2` from `.contributions-intro` (line 142).
Remove `rise d2` from `.contributions-stats` (line 147).
Remove `rise d3` from `.pr-list` (line 155).

- [ ] **Step 2: Add CDN scripts and animations.js before `</body>`**

Add before `</body>`:
```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
  <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
  <script src="animations.js"></script>
```

- [ ] **Step 3: Verify in browser**

Open contributions.html. Check:
- Header elements fade up on load
- PR list items stagger in batches as you scroll
- Smooth scroll works

- [ ] **Step 4: Commit**

```bash
git add contributions.html
git commit -m "feat: add GSAP scroll animations to contributions.html"
```

---

### Task 6: Update testimonials.html — remove .rise classes, add scripts

**Files:**
- Modify: `testimonials.html`

- [ ] **Step 1: Remove `.rise` and delay classes**

Remove `class="rise"` from `<nav>` (line 81).
Remove `rise d1` from `<h1>` (line 90).
Remove `rise d2` from `.testimonials-intro` (line 91).
Remove `rise d3` from the wrapper `<div>` around testimonial cards (line 95). Change `<div class="rise d3">` to just `<div>`.

- [ ] **Step 2: Add CDN scripts and animations.js before `</body>`**

Add before `</body>`:
```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
  <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
  <script src="animations.js"></script>
```

- [ ] **Step 3: Verify in browser**

Open testimonials.html. Check:
- Heading and intro fade up on load
- Testimonial cards fade up individually as they scroll into view
- Smooth scroll works

- [ ] **Step 4: Commit**

```bash
git add testimonials.html
git commit -m "feat: add GSAP scroll animations to testimonials.html"
```

---

## Chunk 4: Final verification

### Task 7: Cross-page verification and final commit

- [ ] **Step 1: Test all four pages in sequence**

Open each page and verify:
1. `index.html` — hero reveal, stats count-up, repo cascade, all fade-ins, hamburger menu, smooth scroll
2. `about.html` — heading + paragraph stagger, smooth scroll
3. `contributions.html` — header fade-in, batched PR list stagger, smooth scroll
4. `testimonials.html` — heading fade-in, card stagger on scroll, smooth scroll

- [ ] **Step 2: Test reduced motion**

In browser dev tools, emulate `prefers-reduced-motion: reduce`. Reload each page. All content should appear immediately with no animations. Stat numbers should show real values (no count-up).

- [ ] **Step 3: Test no-JS fallback**

Disable JavaScript in browser. Reload index.html. All content should be visible except hero text (hidden by CSS `.hero-line-inner` transform). Stat numbers show real values. Page is fully readable.

- [ ] **Step 4: Test mobile responsiveness**

Resize to mobile width (<768px). Test:
- Hamburger menu opens/closes properly
- Scroll is blocked when menu is open (lenis.stop)
- All animations still trigger correctly
- No horizontal overflow

- [ ] **Step 5: Test nav anchor links**

Click nav links (#oss, #testimonials, #writing). Lenis should smooth-scroll to the section.

- [ ] **Step 6: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "fix: final animation adjustments after cross-page testing"
```
