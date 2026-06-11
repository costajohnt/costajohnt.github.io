# GSAP ScrollTrigger + Lenis Scroll Animations

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Statement pieces + smooth scroll (Approach B intensity, Approach A implementation)

## Summary

Replace the existing CSS-only `.rise` animations with GSAP ScrollTrigger-driven scroll animations and add Lenis smooth scrolling. Three sections on the homepage get "statement piece" treatments (hero, OSS stats, repo chips). Everything else gets clean scroll-triggered fade-ins. The result is a high-end portfolio feel without over-designing.

## Dependencies

Exact CDN script tags:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
```

- Both are free for personal sites. No build step required.
- Combined payload: ~45KB gzipped

## Architecture

### Shared `animations.js` file

All animation logic lives in a single `animations.js` file loaded on every page. It uses defensive element checks (`if (el)` / `querySelectorAll` returning empty) so page-specific animations simply do not fire on pages that lack those elements. This avoids duplication and keeps each HTML file clean.

### Lenis + GSAP sync

Lenis takes over scroll handling and provides momentum-based inertia. GSAP ScrollTrigger must be synced to Lenis's scroll position rather than the native scroll:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(function(time) { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
```

### Lenis configuration

```js
var lenis = new Lenis({
  duration: 1.2,
  easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
  orientation: 'vertical',
  smoothWheel: true,
});
```

### Lenis + mobile hamburger menu

On `index.html`, the hamburger menu sets `document.body.style.overflow = 'hidden'`. Lenis does not respect external overflow changes. The hamburger open/close handlers must call `lenis.stop()` and `lenis.start()` respectively:

```js
// In the hamburger toggle code:
function open() {
  // ... existing open logic ...
  if (window.lenis) window.lenis.stop();
}
function close() {
  // ... existing close logic ...
  if (window.lenis) window.lenis.start();
}
```

Lenis must be assigned to `window.lenis` in animations.js to enable this.

## Animation Inventory

### Statement Piece 1: Hero Line Reveal (index.html only, on page load)

The hero heading is restructured into wrapped lines. The `sr-only` span is preserved:

```html
<h1>
  <span class="sr-only">John Costa — </span>
  <span class="hero-line"><span class="hero-line-inner">Engineer, leader,</span></span>
  <span class="hero-line"><span class="hero-line-inner"><span class="accent"><span class="italic">builder.</span></span></span></span>
</h1>
```

- `.hero-line` has `overflow: hidden`
- `.hero-line-inner` starts at `translateY(110%)`
- GSAP animates each `.hero-line-inner` to `y: 0%` with `stagger: 0.15`, `duration: 0.9`, `ease: power3.out`, `delay: 0.3`
- Bio paragraph fades up (`opacity: 0 -> 1`, `y: 20px -> 0`) at `delay: 0.9`

This plays on page load (above the fold), not scroll-triggered.

### Statement Piece 2: OSS Stats Count-Up (index.html only, scroll-triggered)

HTML transformation for stat elements:

**Before:**
```html
<div class="number accent-num">56</div>
```

**After:**
```html
<div class="number accent-num" data-count="56">0</div>
```

For "20+": `data-count="20" data-suffix="+"`, initial text content `0`.

- Each `.contrib-stat` card fades in with a scale effect (`scale: 0.95 -> 1`, `opacity: 0 -> 1`) using `ease: back.out(1.4)`
- A `ScrollTrigger.create` with `once: true` fires the counter animation
- Each `[data-count]` element counts from 0 to its target value over 1.5s with `ease: power2.out`
- Trigger: `start: 'top 80%'`

**No-JS / CDN failure fallback:** Initial hidden states are set via JS (`gsap.set()`) rather than CSS. If JS fails to load, elements remain visible with their default styles and the stat numbers show "0". To handle this, the HTML keeps the real numbers as `data-count` and a `<noscript>` style block is not needed since the JS sets initial states.

Actually, a better approach: set `data-count` and keep the real number as text content. The JS replaces text content with "0" before animating. If JS never loads, users see the real numbers.

**Revised approach:**
```html
<div class="number accent-num" data-count="56">56</div>
```
The animation JS does: `el.textContent = '0'` then counts up. If JS fails, "56" stays visible.

### Statement Piece 3: Repo Chip Cascade (index.html only, scroll-triggered)

- Each `.repo-chip` starts hidden (set via JS: `gsap.set('.repo-chip', { opacity: 0, y: 20 })`)
- GSAP staggers them with `stagger: { amount: 0.5, grid: 'auto', from: 'start' }` creating a wave effect across the grid
- `duration: 0.5`, `ease: power2.out`
- Trigger: `start: 'top 82%'`

### Standard scroll-triggered animations (all pages)

All of these follow the same pattern. Initial hidden state set via `gsap.set()`. Animation: `opacity: 0 -> 1`, `translateY(16-30px) -> 0`, `duration: 0.5-0.7`, `ease: power2.out`.

#### index.html

| Element | Trigger start | Stagger | Notes |
|---|---|---|---|
| `.value-card` | `top 85%` | `0.12s` | Three cards stagger left to right |
| `.section-header` | `top 88%` | none | Each header independently triggered |
| `.contrib-repos-label` | `top 90%` | none | Simple fade-up |
| `.recent-pr-item` | `top 82%` | `0.08s` | Rows stagger top to bottom |
| `.my-projects-label` | `top 90%` | none | Simple fade |
| `.oss-card` | `top 85%` | `0.1s delay` | Each card independently triggered |
| `.oss-ethos` | `top 85%` | none | Simple fade-up |
| `blockquote` (in `.testimonial-teaser`) | `top 85%` | none | Quote fades, then `.testimonial-teaser-attr` follows at `-=0.3` |
| `.writing-item` | `top 82%` | `0.08s` | Rows stagger like PR items |

#### about.html

| Element | Trigger start | Stagger | Notes |
|---|---|---|---|
| `.about-page h1` | on load | none | Fade-up on load (above the fold) |
| `.about-page p` | on load | `0.12s` | Staggered fade-up on load. All paragraphs are near the top of the page, so load-triggered rather than scroll-triggered. |

#### contributions.html

| Element | Trigger start | Stagger | Notes |
|---|---|---|---|
| `.section-eyebrow` | on load | none | Above the fold |
| `h1` | on load | none | Above the fold |
| `.contributions-intro` | on load | none | Above the fold |
| `.contributions-stats` | on load | none | Above the fold, fades in as a unit |
| `.pr-list-item` | `top 82%` | batch | 56 items: stagger in batches of 10 (`stagger: 0.04`, each batch triggered independently via ScrollTrigger). This avoids a 4+ second animation for the full list. |

#### testimonials.html

| Element | Trigger start | Stagger | Notes |
|---|---|---|---|
| `h1` | on load | none | Above the fold |
| `.testimonials-intro` | on load | none | Above the fold |
| `.testimonial-card` | `top 85%` | `0.15s` | Each card fades up independently as it enters the viewport |

### Nav animation

The `nav` element currently has `.rise` class on all pages. After removing `.rise`, the nav gets **no animation** -- it is `position: fixed` and always visible, so an entrance animation would be distracting. It simply appears immediately.

## CSS Changes

### Remove

- `@keyframes rise` keyframe definition
- `.rise` class and `.d1` through `.d6` delay classes
- `scroll-behavior: smooth` from the `html` rule (Lenis handles smooth scrolling; keeping both causes double-smoothing and janky anchor link behavior)

### Add

```css
.hero-line {
  display: block;
  overflow: hidden;
}

.hero-line-inner {
  display: block;
  transform: translateY(110%);
}
```

### No CSS-based hidden states

Initial hidden states for animated elements are set via `gsap.set()` in JS, **not** in CSS. This ensures that if the CDN fails or JS is disabled, all content remains visible and the page degrades gracefully to a static (but fully readable) site.

The only CSS-based hidden state is `.hero-line-inner { transform: translateY(110%) }` because the hero text would look broken without JS (showing plain text without the line structure). The `gsap.set()` approach handles everything else.

## HTML Changes

### All pages (index, about, contributions, testimonials)

- Add 3 CDN `<script>` tags before `</body>` (GSAP, ScrollTrigger, Lenis)
- Add `<script src="animations.js"></script>` after the CDN tags
- Remove all `.rise`, `.d1`-`.d6` classes from all elements
- Remove `scroll-behavior: smooth` is handled in CSS, not HTML

### index.html specific

- Restructure `<h1>` into `.hero-line` / `.hero-line-inner` wrapper spans, preserving `<span class="sr-only">John Costa — </span>`
- Add `data-count` (and `data-suffix` where needed) attributes to `.number` elements inside `.contrib-stats`. Keep real numbers as text content (JS replaces with 0 before counting up).
- In hamburger menu JS, add `lenis.stop()` / `lenis.start()` calls

### about.html

- Remove `.rise d1`-`.d5` classes from h1 and paragraphs

### contributions.html

- Remove `.rise d1`-`.d3` classes from eyebrow, h1, intro, stats, and pr-list wrapper
- The `.pr-list` wrapper no longer needs animation classes since individual `.pr-list-item` elements will be animated by JS

### testimonials.html

- Remove `.rise d1`-`.d3` classes from h1, intro, and testimonial card wrapper div

## New file

| File | Purpose |
|---|---|
| `animations.js` | Shared animation initialization: Lenis setup, GSAP ScrollTrigger animations for all pages. Uses defensive checks so page-specific animations silently skip on pages that lack those elements. |

## Accessibility

### prefers-reduced-motion

All animations are wrapped in a `prefers-reduced-motion` check:

```js
var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  // all animations
} else {
  // gsap.set() everything to final visible state
  // show real stat numbers (no count-up)
  // hero lines shown immediately
}
```

### No scroll hijacking

Lenis provides smooth momentum scrolling but does not hijack scroll direction or create pinned/locked sections. Users maintain full control of scroll direction and speed. Scroll anchors (hash links in nav) continue to work via Lenis's built-in anchor support.

### Focus states

All existing `:focus-visible` styles are preserved. No animation interferes with keyboard navigation.

### Graceful degradation

If JS fails to load (CDN outage, blocked scripts):
- All content remains visible (no CSS-based hidden states except hero lines)
- Stat numbers show their real values (not 0)
- The page is fully functional, just without animations or smooth scroll
- Native scroll behavior works normally

## Performance

- GSAP ScrollTrigger uses `IntersectionObserver` internally when available
- All scroll-triggered animations use `once: true` semantics (trigger once, do not re-trigger on scroll back up)
- No continuous scroll-linked animations (no parallax, no scrub). Animations fire once and complete
- Lenis uses `requestAnimationFrame` synced with GSAP's ticker (single rAF loop, not two)
- Total JS payload: ~45KB gzipped (GSAP ~30KB, ScrollTrigger ~10KB, Lenis ~4KB)
- contributions.html: 56 PR items use batched stagger to avoid long animation sequences

## File changes summary

| File | Change |
|---|---|
| `styles.css` | Remove `@keyframes rise`, `.rise`/`.d1`-`.d6`, `scroll-behavior: smooth`. Add `.hero-line` / `.hero-line-inner`. |
| `animations.js` | **New file.** Lenis init, GSAP ScrollTrigger animations, prefers-reduced-motion handling. |
| `index.html` | Restructure hero `<h1>` with sr-only preserved. Add `data-count`/`data-suffix` to stats. Remove `.rise` classes. Add CDN + animations.js scripts. Add `lenis.stop()/start()` to hamburger menu. |
| `about.html` | Remove `.rise` classes. Add CDN + animations.js scripts. |
| `contributions.html` | Remove `.rise` classes. Add CDN + animations.js scripts. |
| `testimonials.html` | Remove `.rise` classes. Add CDN + animations.js scripts. |
