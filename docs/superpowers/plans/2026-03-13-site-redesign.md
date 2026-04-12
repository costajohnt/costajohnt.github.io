# Personal Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign jcosta.tech from a minimal bio page into a full professional presence with hero, value props, OSS contributions, blog posts, testimonials, and automated data updates.

**Architecture:** Static HTML/CSS site on GitHub Pages. Two HTML pages (`index.html`, `testimonials.html`) sharing a `styles.css`. Blog post and OSS contribution data stored as JSON files, embedded into HTML by GitHub Actions on a daily schedule. No build tools or JavaScript framework.

**Tech Stack:** HTML, CSS (custom properties, grid, flexbox), Google Fonts (Outfit + Lora), GitHub Actions (Node.js 20 scripts with zero npm dependencies, using native `fetch`), Hashnode GraphQL API, GitHub Search API.

**Prerequisites:** Node.js 18+ (for native `fetch`). The oss-autopilot dashboard running locally is needed for Task 16 (video recording) but can be skipped with placeholder.

---

## File Structure

### Files to create
| File | Responsibility |
|------|---------------|
| `styles.css` | All shared styles: variables, reset, grain texture, animations, nav, hero, value props, OSS section, writing section, footer, responsive breakpoints |
| `testimonials.html` | Standalone testimonials page with shared nav/footer |
| `data/posts.json` | Blog post data (title, subtitle, date, readTime, url) |
| `data/oss-stats.json` | OSS contribution data (stats, repos, projects) |
| `.github/workflows/update-posts.yml` | Daily cron: fetch Hashnode posts, write JSON, regenerate HTML |
| `.github/workflows/update-oss-stats.yml` | Daily cron: fetch GitHub PRs, write JSON, regenerate HTML |
| `scripts/update-posts.mjs` | Node.js script that fetches from Hashnode API and writes `data/posts.json` |
| `scripts/update-oss-stats.mjs` | Node.js script that fetches from GitHub API and writes `data/oss-stats.json` |
| `scripts/embed-data.mjs` | Node.js script that reads JSON data files and embeds them into index.html |
| `assets/social-card.png` | OG image replacement (1200x630, matches site aesthetic) |
| `assets/oss-autopilot-dashboard.mp4` | Looping video of dashboard for project card (skip if dashboard not available locally; keep placeholder) |

### Files already existing (do not recreate)
| File | Note |
|------|------|
| `CNAME` | Custom domain config for GitHub Pages. **Do NOT delete.** |
| `notes/portfolio-website/remotion-video-idea.md` | Already created during brainstorming. Listed in spec "Files to Add" but already exists. |

### Files to modify
| File | Change |
|------|--------|
| `index.html` | Complete rewrite: new fonts, meta tags, layout, all sections |
| `favicon.svg` | Update colors to match warm amber palette |

### Files to delete
| File | Reason |
|------|--------|
| `resume.html` | No longer linked |
| `John-Costa-Resume.pdf` | No longer linked |
| `portrait.jpg` | Replaced by abstract geometric visual |

---

## Chunk 1: Foundation & Hero

### Task 1: Create branch and delete old files

**Files:**
- Delete: `resume.html`, `John-Costa-Resume.pdf`, `portrait.jpg`

- [ ] **Step 1: Create feature branch from main**

```bash
git checkout main
git pull origin main
git checkout -b redesign-site
```

- [ ] **Step 2: Delete files that are no longer needed (do NOT delete `CNAME` or `favicon.svg`)**

```bash
git rm resume.html John-Costa-Resume.pdf portrait.jpg
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove resume, PDF, and portrait for redesign"
```

### Task 2: Create styles.css with CSS foundation

**Files:**
- Create: `styles.css`

This file contains all shared styles. It's large but should be written as a single unit since the CSS custom properties, reset, and component styles are interdependent.

- [ ] **Step 1: Create `styles.css` with CSS variables, reset, grain texture, and animations**

```css
/* ── Variables ── */
:root {
  --bg: #f6f4f0;
  --bg-elevated: #ffffff;
  --bg-subtle: #edeae4;
  --text: #1c1917;
  --text-secondary: #57534e;
  --text-tertiary: #a8a29e;
  --accent: #b45309;
  --accent-soft: rgba(180, 83, 9, 0.07);
  --accent-medium: rgba(180, 83, 9, 0.14);
  --green: #15803d;
  --green-soft: rgba(21, 128, 61, 0.08);
  --border: #e7e5e0;
  --border-hover: #d6d3cd;
  --display: 'Outfit', -apple-system, sans-serif;
  --body: 'Lora', Georgia, serif;
  --radius: 10px;
}

/* ── Reset ── */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 17px; scroll-behavior: smooth; }

body {
  font-family: var(--display);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── Grain texture ── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.028;
  pointer-events: none;
  z-index: 9999;
}

/* ── Animations ── */
@keyframes rise {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.rise { animation: rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
.d1 { animation-delay: 0.06s; }
.d2 { animation-delay: 0.14s; }
.d3 { animation-delay: 0.24s; }
.d4 { animation-delay: 0.36s; }
.d5 { animation-delay: 0.48s; }
.d6 { animation-delay: 0.6s; }
```

- [ ] **Step 2: Append nav styles to `styles.css`**

```css
/* ── Nav ── */
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 68px;
  padding: 0 clamp(1.5rem, 5vw, 4.5rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(246, 244, 240, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  z-index: 100;
}

.nav-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 2.25rem;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 500;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--text); }
```

- [ ] **Step 3: Append container, hero, and button styles to `styles.css`**

```css
.container {
  max-width: 1060px;
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 5vw, 4.5rem);
}

/* ── Hero ── */
.hero {
  padding: calc(68px + 5.5rem) 0 5rem;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 4rem;
  align-items: center;
}

.hero-text h1 {
  font-family: var(--display);
  font-size: clamp(2.6rem, 5.5vw, 3.8rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 1.25rem;
}

.hero-text h1 .italic {
  font-family: var(--body);
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.01em;
}

.hero-text h1 .accent { color: var(--accent); }

.hero-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}

.hero-tag {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.3rem 0.85rem;
  background: var(--bg-subtle);
  color: var(--text-secondary);
  border-radius: 100px;
  letter-spacing: 0.01em;
}

.bio {
  font-family: var(--body);
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--text-secondary);
  max-width: 520px;
}
.bio strong {
  font-weight: 400;
  color: var(--text);
}

.hero-cta {
  display: flex;
  gap: 0.65rem;
  margin-top: 2rem;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 1.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--display);
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.25s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--text);
  color: var(--bg);
  border: 1.5px solid var(--text);
}
.btn-primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(180, 83, 9, 0.2);
}

.btn-ghost {
  background: transparent;
  color: var(--text);
  border: 1.5px solid var(--border-hover);
}
.btn-ghost:hover {
  border-color: var(--text);
  background: var(--text);
  color: var(--bg);
}

.btn svg { width: 14px; height: 14px; }

/* ── Abstract hero visual ── */
.hero-visual {
  width: 300px;
  height: 340px;
  position: relative;
}

.shape {
  position: absolute;
  border-radius: var(--radius);
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 0;
  right: 0;
  background: linear-gradient(145deg, var(--accent-soft), var(--accent-medium));
  border: 1px solid rgba(180, 83, 9, 0.1);
  animation: gentleFloat 6s ease-in-out infinite;
}

.shape-2 {
  width: 160px;
  height: 120px;
  top: 140px;
  right: 80px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  animation: gentleFloat 8s ease-in-out infinite 1s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  bottom: 0;
  right: 20px;
  background: var(--green-soft);
  border: 1px solid rgba(21, 128, 61, 0.1);
  border-radius: 50%;
  animation: gentleFloat 7s ease-in-out infinite 0.5s;
}

.shape-line {
  position: absolute;
  width: 1px;
  height: 80px;
  background: var(--border);
  top: 60px;
  left: 40px;
}

.shape-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.shape-dot-1 { top: 56px; left: 36px; }
.shape-dot-2 { top: 140px; left: 36px; }
.shape-dot-3 { top: 100px; right: 40px; }
```

- [ ] **Step 4: Append value props, section, and OSS section styles to `styles.css`**

```css
/* ── Value props ── */
.values {
  padding: 0 0 4rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.value-card {
  background: var(--bg-elevated);
  padding: 2rem;
}

.value-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.value-icon-amber { background: var(--accent-soft); color: var(--accent); }
.value-icon-green { background: var(--green-soft); color: var(--green); }
.value-icon-neutral { background: var(--bg-subtle); color: var(--text-secondary); }

.value-card h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  letter-spacing: -0.01em;
}

.value-card p {
  font-family: var(--body);
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.65;
}

/* ── Section styling ── */
.section {
  padding: 4.5rem 0;
  border-top: 1px solid var(--border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2.5rem;
}

.section-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.4rem;
}

.section-heading {
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.section-link {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.section-link:hover { color: var(--accent); }

/* ── Contribution Stats ── */
.contrib-stats {
  display: flex;
  gap: 1px;
  background: var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 2rem;
}

.contrib-stat {
  flex: 1;
  background: var(--bg-elevated);
  padding: 1.5rem 1.75rem;
  text-align: center;
}

.contrib-stat .number {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 0.3rem;
  color: var(--text);
}

.contrib-stat .number.accent-num { color: var(--accent); }
.contrib-stat .number.green-num { color: var(--green); }

.contrib-stat .label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
}

/* ── Notable Repos ── */
.contrib-repos { margin-bottom: 2.5rem; }

.contrib-repos-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}

.repo-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.repo-chip:hover {
  border-color: var(--border-hover);
  box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
  transform: translateY(-1px);
}

.repo-chip-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

.repo-chip-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  color: var(--text-tertiary);
}

.repo-chip-meta .star-icon { color: var(--accent); font-size: 0.72rem; }

.repo-chip .pr-count {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.12rem 0.45rem;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 100px;
  margin-left: 0.5rem;
}
```

- [ ] **Step 5: Append OSS project cards, writing, footer, and responsive styles to `styles.css`**

```css
/* ── My Projects ── */
.my-projects-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.oss-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
}

.oss-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: block;
}

.oss-card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 8px 32px rgba(28, 25, 23, 0.05);
  transform: translateY(-2px);
}

.oss-img {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.oss-flagship .oss-img {
  height: 260px;
  background: linear-gradient(145deg, #1c1917, #292524);
}

.oss-flagship .oss-img::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 25% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 75% 30%, rgba(21, 128, 61, 0.06) 0%, transparent 40%);
}

.oss-flagship .oss-img video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.oss-small .oss-img {
  height: 120px;
  background: linear-gradient(145deg, #1c1917, #292524);
}

.oss-flagship { grid-row: span 2; }

.oss-img-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
  z-index: 1;
  padding: 1.5rem;
  text-align: center;
  line-height: 1.7;
}

.oss-body { padding: 1.25rem 1.5rem; }

.oss-body h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  letter-spacing: -0.01em;
}

.oss-body .description {
  font-family: var(--body);
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.65;
}

.oss-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
}

.tech-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }

.tech-tag {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 100px;
  letter-spacing: 0.01em;
}

.tag-amber { background: var(--accent-soft); color: var(--accent); }
.tag-green { background: var(--green-soft); color: var(--green); }
.tag-neutral { background: var(--bg-subtle); color: var(--text-secondary); }

.oss-stars { font-size: 0.7rem; color: var(--text-tertiary); }

/* ── OSS Ethos callout ── */
.oss-ethos {
  margin-top: 2rem;
  padding: 1.5rem 2rem;
  background: var(--green-soft);
  border: 1px solid rgba(21, 128, 61, 0.1);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.oss-ethos-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(21, 128, 61, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.oss-ethos p {
  font-family: var(--body);
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.65;
}

.oss-ethos strong { font-weight: 400; color: var(--text); }

.oss-ethos a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}

/* ── Writing ── */
.writing-list { display: flex; flex-direction: column; }

.writing-item {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 1.5rem;
  align-items: baseline;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.writing-item:first-child { border-top: 1px solid var(--border); }

.writing-item:hover {
  padding-left: 0.75rem;
  background: linear-gradient(90deg, var(--accent-soft) 0%, transparent 40%);
}

.writing-date {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  font-weight: 500;
  white-space: nowrap;
}

.writing-item h3 {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.writing-item .subtitle {
  font-family: var(--body);
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.writing-time {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* ── Read More CTA ── */
.writing-cta {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
}

/* ── Footer ── */
footer {
  padding: 3.5rem 0 4.5rem;
  border-top: 1px solid var(--border);
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.footer-brand {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  line-height: 1.7;
}

.footer-links { display: flex; gap: 2rem; }

.footer-links a {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-links a:hover { color: var(--accent); }

/* ── Focus states (accessibility) ── */
a:focus-visible,
.btn:focus-visible,
.repo-chip:focus-visible,
.oss-card:focus-visible,
.writing-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Responsive ── */
@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 2.5rem;
    text-align: center;
  }
  .hero-visual {
    width: 220px;
    height: 260px;
    justify-self: center;
    order: -1;
  }
  .shape-1 { width: 150px; height: 150px; }
  .shape-2 { width: 120px; height: 90px; top: 100px; right: 50px; }
  .shape-3 { width: 70px; height: 70px; }
  .shape-line { display: none; }
  .shape-dot { display: none; }
  .bio { max-width: 100%; }
  .hero-tags { justify-content: center; }
  .hero-cta { justify-content: center; }
  .values { grid-template-columns: 1fr; }
  .contrib-stats { flex-wrap: wrap; }
  .contrib-stat { min-width: 45%; }
  .repo-grid { grid-template-columns: 1fr; }
  .oss-grid { grid-template-columns: 1fr; }
  .oss-flagship { grid-row: auto; }
  .writing-item { grid-template-columns: 1fr; gap: 0.25rem; }
  .writing-date { order: -1; }
  .writing-time { display: none; }
  .footer-inner {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
    align-items: center;
  }
  .oss-ethos { flex-direction: column; text-align: center; }
}

@media (max-width: 480px) {
  nav {
    height: auto;
    padding: 1rem clamp(1rem, 4vw, 2rem);
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .nav-links {
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
  }
  .hero { padding-top: 8rem; }
}
```

- [ ] **Step 6: Commit**

Note: The styles won't render until Task 3 rewrites `index.html` to link `styles.css`. Visual verification happens in Task 3 Step 3.

```bash
git add styles.css
git commit -m "feat: create shared styles.css with full design system"
```

### Task 3: Rewrite index.html with new head, nav, and hero

**Files:**
- Modify: `index.html` (complete rewrite)

- [ ] **Step 1: Rewrite `index.html` head section**

Replace the entire `<head>` with new fonts (Outfit + Lora), updated meta tags, and link to `styles.css`. Remove all inline `<style>`. Update og:image to reference `assets/social-card.png`. Update og:description to reflect builder positioning.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>John Costa</title>

  <meta name="description" content="Product-focused builder and full-stack generalist. A decade of shipping value across the stack, leading teams, and contributing to open source.">
  <meta property="og:title" content="John Costa">
  <meta property="og:description" content="Product-focused builder and full-stack generalist. Shipping value, leading teams, contributing to open source.">
  <meta property="og:image" content="https://jcosta.tech/assets/social-card.png">
  <meta property="og:url" content="https://jcosta.tech">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="John Costa">
  <meta name="twitter:description" content="Product-focused builder and full-stack generalist. Shipping value, leading teams, contributing to open source.">
  <meta name="twitter:image" content="https://jcosta.tech/assets/social-card.png">

  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
```

- [ ] **Step 2: Write nav and hero HTML**

```html
<body>
  <nav class="rise">
    <a href="/" class="nav-name">John Costa</a>
    <ul class="nav-links">
      <li><a href="#oss">Open Source</a></li>
      <li><a href="#writing">Writing</a></li>
      <li><a href="https://github.com/costajohnt">GitHub</a></li>
    </ul>
  </nav>

  <div class="container">
    <section class="hero">
      <div class="hero-text">
        <h1 class="rise d1">Builder, <span class="italic">engineer,</span><br><span class="accent">product thinker.</span></h1>
        <div class="hero-tags rise d2">
          <span class="hero-tag">Full-Stack Generalist</span>
          <span class="hero-tag">IC & Leader</span>
          <span class="hero-tag">Open Source</span>
          <span class="hero-tag">AI-Augmented</span>
        </div>
        <p class="bio rise d3">
          I turn ambiguity into shipped products. I've spent a decade building across the
          full stack, from architecture to UI, and from startup scrappiness to leading
          engineering teams. I believe the best builders <strong>identify what matters</strong>,
          break it into incremental value, and ship a steady stream toward the goal. Today
          I'm most excited about <strong>AI-augmented building</strong> and contributing to
          <strong>open source</strong> tools that give back.
        </p>
        <div class="hero-cta rise d4">
          <a href="mailto:costajohnt@gmail.com" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Get in touch
          </a>
          <a href="https://github.com/costajohnt" class="btn btn-ghost">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </div>

      <div class="hero-visual rise d2" aria-hidden="true">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape-line"></div>
        <div class="shape-dot shape-dot-1"></div>
        <div class="shape-dot shape-dot-2"></div>
        <div class="shape-dot shape-dot-3"></div>
      </div>
    </section>
```

Note: `aria-hidden="true"` on the hero-visual per accessibility spec.

- [ ] **Step 3: Verify hero renders correctly in browser**

Open `index.html`. Confirm:
- Frosted glass nav with "John Costa" left, links right
- Two-column hero: text left, abstract shapes right
- Headline with mixed Outfit/Lora/amber styling
- Tags, bio, and CTA buttons render correctly
- Fade-up animations fire on load
- Shapes have gentle float animation

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: rewrite index.html with new head, nav, and hero section"
```

---

## Chunk 2: Main Page Content Sections

### Task 4: Add value proposition cards

**Files:**
- Modify: `index.html` (add HTML after hero section closing tag)

- [ ] **Step 1: Add value props HTML after the hero `</section>` tag**

```html
    <div class="values rise d5">
      <div class="value-card">
        <div class="value-icon value-icon-amber">&#9670;</div>
        <h3>Product-Focused</h3>
        <p>I start with the problem, not the technology. Every line of code should ship value to the customer. I think in incremental streams, not big bangs.</p>
      </div>
      <div class="value-card">
        <div class="value-icon value-icon-neutral">&#9632;</div>
        <h3>Full-Stack Generalist</h3>
        <p>Architecture to UI, Rails to React, infrastructure to design. A decade of wearing every hat in startups means I can go wherever the work needs me.</p>
      </div>
      <div class="value-card">
        <div class="value-icon value-icon-green">&#9679;</div>
        <h3>AI-Augmented Builder</h3>
        <p>Design, product, and engineering are converging. I'm leaning into that future, using AI tools to build faster and with broader reach than any single discipline.</p>
      </div>
    </div>
```

- [ ] **Step 2: Verify value cards render as three-column grid with 1px borders**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add value proposition cards section"
```

### Task 5: Add Open Source section with stats, repos, and projects

**Files:**
- Modify: `index.html` (add HTML after value props)

- [ ] **Step 1: Add Open Source section header and contribution stats bar**

```html
    <section class="section" id="oss">
      <div class="section-header">
        <div>
          <p class="section-eyebrow">Open Source</p>
          <h2 class="section-heading">Building in the open</h2>
        </div>
        <a href="https://github.com/costajohnt" class="section-link">All repos &rarr;</a>
      </div>

      <!-- Stats bar: values will be updated by GitHub Action -->
      <div class="contrib-stats">
        <div class="contrib-stat">
          <div class="number accent-num">55</div>
          <div class="label">PRs Merged</div>
        </div>
        <div class="contrib-stat">
          <div class="number">20+</div>
          <div class="label">Repos</div>
        </div>
        <div class="contrib-stat">
          <div class="number green-num">77%</div>
          <div class="label">Merge Rate</div>
        </div>
        <div class="contrib-stat">
          <div class="number">6</div>
          <div class="label">Languages</div>
        </div>
      </div>
```

- [ ] **Step 2: Add notable contributions repo grid**

```html
      <!-- Notable contributions: will be updated by GitHub Action -->
      <div class="contrib-repos">
        <p class="contrib-repos-label">Contributing to projects developers rely on</p>
        <div class="repo-grid">
          <a href="https://github.com/Homebrew/brew" class="repo-chip">
            <span class="repo-chip-name">Homebrew/brew</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 47k <span class="pr-count">2 PRs</span></span>
          </a>
          <a href="https://github.com/vadimdemedes/ink" class="repo-chip">
            <span class="repo-chip-name">ink</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 35.5k <span class="pr-count">15 PRs</span></span>
          </a>
          <a href="https://github.com/DioxusLabs/dioxus" class="repo-chip">
            <span class="repo-chip-name">Dioxus</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 35.3k</span>
          </a>
          <a href="https://github.com/directus/directus" class="repo-chip">
            <span class="repo-chip-name">Directus</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 34.5k</span>
          </a>
          <a href="https://github.com/refined-github/refined-github" class="repo-chip">
            <span class="repo-chip-name">refined-github</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 30.7k <span class="pr-count">2 PRs</span></span>
          </a>
          <a href="https://github.com/biomejs/biome" class="repo-chip">
            <span class="repo-chip-name">Biome</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 24k</span>
          </a>
          <a href="https://github.com/oxc-project/oxc" class="repo-chip">
            <span class="repo-chip-name">oxc</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 19.9k</span>
          </a>
          <a href="https://github.com/super-productivity/super-productivity" class="repo-chip">
            <span class="repo-chip-name">Super Productivity</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 17.9k <span class="pr-count">6 PRs</span></span>
          </a>
          <a href="https://github.com/adobe/react-spectrum" class="repo-chip">
            <span class="repo-chip-name">React Spectrum</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 14.9k</span>
          </a>
          <a href="https://github.com/owncast/owncast" class="repo-chip">
            <span class="repo-chip-name">Owncast</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 11k <span class="pr-count">7 PRs</span></span>
          </a>
          <a href="https://github.com/py-pdf/pypdf" class="repo-chip">
            <span class="repo-chip-name">pypdf</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 9.9k <span class="pr-count">2 PRs</span></span>
          </a>
          <a href="https://github.com/isomorphic-git/isomorphic-git" class="repo-chip">
            <span class="repo-chip-name">isomorphic-git</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> 8.1k</span>
          </a>
        </div>
      </div>
```

- [ ] **Step 3: Add project cards grid**

The flagship card uses a `<video>` element with `autoplay loop muted playsinline` for the dashboard recording. Until the video asset exists, show the placeholder text.

```html
      <p class="my-projects-label">My projects</p>
      <div class="oss-grid">
        <a href="https://github.com/costajohnt/oss-autopilot" class="oss-card oss-flagship">
          <div class="oss-img">
            <!-- Replace placeholder with <video> once assets/oss-autopilot-dashboard.mp4 exists -->
            <div class="oss-img-text">
              oss-autopilot dashboard<br><br>
              [ video placeholder ]
            </div>
          </div>
          <div class="oss-body">
            <h3>oss-autopilot</h3>
            <p class="description">An AI-powered autopilot for managing open source contributions. It tracks PRs, responds to maintainers, discovers new issues, and helps maintain velocity. Built as a Claude Code plugin that makes sustained OSS contribution practical.</p>
            <div class="oss-footer">
              <div class="tech-tags">
                <span class="tech-tag tag-amber">TypeScript</span>
                <span class="tech-tag tag-amber">Claude Code</span>
              </div>
              <span class="oss-stars">&#9733; 6</span>
            </div>
          </div>
        </a>

        <a href="https://github.com/costajohnt/alpaca-trader" class="oss-card oss-small">
          <div class="oss-img">
            <div class="oss-img-text">[ alpaca-trader ]</div>
          </div>
          <div class="oss-body">
            <h3>alpaca-trader</h3>
            <p class="description">A self-evolving automated trading system that combines sentiment analysis, insider signals, and AI-driven position management. It learns and adapts over time.</p>
            <div class="oss-footer">
              <div class="tech-tags">
                <span class="tech-tag tag-green">Python</span>
                <span class="tech-tag tag-green">AI/ML</span>
              </div>
            </div>
          </div>
        </a>

        <a href="https://github.com/costajohnt/mermaid-to-pdf-vscode" class="oss-card oss-small">
          <div class="oss-img">
            <div class="oss-img-text">[ mermaid-to-pdf ]</div>
          </div>
          <div class="oss-body">
            <h3>mermaid-to-pdf</h3>
            <p class="description">A VS Code extension that converts Markdown files with Mermaid diagrams into PDF. A small tool that solves a real problem.</p>
            <div class="oss-footer">
              <div class="tech-tags">
                <span class="tech-tag tag-neutral">TypeScript</span>
                <span class="tech-tag tag-neutral">VS Code</span>
              </div>
            </div>
          </div>
        </a>
      </div>
```

- [ ] **Step 4: Add giving back callout and close the section**

```html
      <div class="oss-ethos">
        <div class="oss-ethos-icon">&#9829;</div>
        <p>
          Open source isn't just about building tools. It's about <strong>giving back</strong>.
          I volunteer my engineering skills through organizations like <strong>Ruby for Good</strong>
          and <strong>Activist</strong>, where code can make a real difference for communities that need it.
          These numbers update automatically via <a href="https://github.com/costajohnt/oss-autopilot">oss-autopilot</a>.
        </p>
      </div>
    </section>
```

- [ ] **Step 5: Verify the full Open Source section renders correctly**

Check: stats bar with four cells, repo grid with chips and star counts, asymmetric project card grid (flagship spanning 2 rows), green giving-back callout.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add Open Source section with stats, repos, projects, and callout"
```

### Task 6: Add Writing section, footer, and close the page

**Files:**
- Modify: `index.html` (add HTML after OSS section)

- [ ] **Step 1: Add Writing section with hardcoded posts**

These posts will be replaced by the GitHub Action later. For now, hardcode the 4 most recent.

```html
    <section class="section" id="writing">
      <div class="section-header">
        <div>
          <p class="section-eyebrow">Writing</p>
          <h2 class="section-heading">Recent thinking</h2>
        </div>
        <a href="https://blog.jcosta.tech" class="section-link">All posts &rarr;</a>
      </div>

      <!-- Post list: will be updated by GitHub Action -->
      <div class="writing-list">
        <a href="https://blog.jcosta.tech/claude-code-tips-and-tricks" class="writing-item">
          <span class="writing-date">Mar 7, 2026</span>
          <div>
            <h3>Claude Code Tips and Tricks</h3>
            <p class="subtitle">Practical patterns for AI-assisted engineering from daily use.</p>
          </div>
          <span class="writing-time">7 min</span>
        </a>
        <a href="https://blog.jcosta.tech/the-biggest-bottleneck-in-enterprise-software-isnt-technical" class="writing-item">
          <span class="writing-date">Mar 5, 2026</span>
          <div>
            <h3>The Biggest Bottleneck in Enterprise Software Isn't Technical</h3>
            <p class="subtitle">The coordination tax and how to break through it.</p>
          </div>
          <span class="writing-time">6 min</span>
        </a>
        <a href="https://blog.jcosta.tech/why-functional-programming-is-the-most-important-skill-for-the-ai-era" class="writing-item">
          <span class="writing-date">Feb 24, 2026</span>
          <div>
            <h3>Why Functional Programming Is the Most Important Skill for the AI Era</h3>
            <p class="subtitle">Type-driven design, declarative thinking, and domain modeling.</p>
          </div>
          <span class="writing-time">8 min</span>
        </a>
        <a href="https://blog.jcosta.tech/why-ai-assisted-development-feels-like-engineering-management" class="writing-item">
          <span class="writing-date">Jan 6, 2026</span>
          <div>
            <h3>Why AI-Assisted Development Feels Like Engineering Management</h3>
            <p class="subtitle">How years of code review prepared me for working with Claude.</p>
          </div>
          <span class="writing-time">3 min</span>
        </a>
      </div>

      <div class="writing-cta">
        <a href="https://blog.jcosta.tech" class="btn btn-primary">Read more on the blog</a>
      </div>
    </section>
```

- [ ] **Step 2: Add footer and close the page**

```html
    <footer>
      <div class="footer-inner">
        <div class="footer-brand">
          &copy; 2026 John Costa<br>
          Building products, shipping value.
        </div>
        <div class="footer-links">
          <a href="mailto:costajohnt@gmail.com">Email</a>
          <a href="https://github.com/costajohnt">GitHub</a>
          <a href="https://blog.jcosta.tech">Blog</a>
          <a href="testimonials.html">What colleagues say</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>
```

- [ ] **Step 3: Verify the full page renders correctly end-to-end**

Check all sections render, scroll behavior is smooth, animations fire, hover effects work on writing items and buttons, responsive behavior at 860px and 480px breakpoints.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Writing section and footer to complete main page"
```

---

## Chunk 3: Testimonials Page & Favicon

### Task 7: Create testimonials page

**Files:**
- Create: `testimonials.html`

- [ ] **Step 1: Create `testimonials.html`**

Uses the same `styles.css`, nav, and footer. Add testimonial-specific styles inline in a `<style>` block (they're only used on this page).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What Colleagues Say | John Costa</title>

  <meta name="description" content="Testimonials from colleagues and collaborators who have worked with John Costa.">
  <meta property="og:title" content="What Colleagues Say | John Costa">
  <meta property="og:description" content="Testimonials from colleagues and collaborators.">
  <meta property="og:image" content="https://jcosta.tech/assets/social-card.png">
  <meta property="og:url" content="https://jcosta.tech/testimonials">
  <meta property="og:type" content="website">

  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>
    .testimonials-page {
      padding: calc(68px + 5.5rem) 0 4rem;
    }

    .testimonials-page h1 {
      font-family: var(--display);
      font-size: clamp(2rem, 4vw, 2.8rem);
      font-weight: 600;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }

    .testimonials-intro {
      font-family: var(--body);
      font-size: 1.05rem;
      color: var(--text-secondary);
      margin-bottom: 3rem;
      max-width: 600px;
    }

    .testimonial-card {
      padding: 2rem 0 2rem 2rem;
      border-left: 3px solid var(--accent);
      margin-bottom: 2.5rem;
    }

    .testimonial-card blockquote {
      font-family: var(--body);
      font-size: 1rem;
      line-height: 1.85;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    .testimonial-attribution {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
    }

    .testimonial-role {
      font-size: 0.78rem;
      color: var(--text-tertiary);
      font-weight: 400;
    }
  </style>
</head>
<body>
  <nav class="rise">
    <a href="/" class="nav-name">John Costa</a>
    <ul class="nav-links">
      <li><a href="/#oss">Open Source</a></li>
      <li><a href="/#writing">Writing</a></li>
      <li><a href="https://github.com/costajohnt">GitHub</a></li>
    </ul>
  </nav>

  <div class="container">
    <div class="testimonials-page">
      <h1 class="rise d1">What colleagues say</h1>
      <p class="testimonials-intro rise d2">Recommendations from people I've worked with, ported from LinkedIn.</p>

      <!-- Testimonials: replace with actual LinkedIn recommendations -->
      <div class="rise d3">
        <div class="testimonial-card">
          <blockquote>
            [Placeholder: paste first LinkedIn recommendation here. Replace this entire card with the real testimonial.]
          </blockquote>
          <p class="testimonial-attribution">First Last <span class="testimonial-role">Title, Company</span></p>
        </div>

        <div class="testimonial-card">
          <blockquote>
            [Placeholder: paste second LinkedIn recommendation here.]
          </blockquote>
          <p class="testimonial-attribution">First Last <span class="testimonial-role">Title, Company</span></p>
        </div>

        <div class="testimonial-card">
          <blockquote>
            [Placeholder: paste third LinkedIn recommendation here.]
          </blockquote>
          <p class="testimonial-attribution">First Last <span class="testimonial-role">Title, Company</span></p>
        </div>
      </div>
    </div>

    <footer>
      <div class="footer-inner">
        <div class="footer-brand">
          &copy; 2026 John Costa<br>
          Building products, shipping value.
        </div>
        <div class="footer-links">
          <a href="mailto:costajohnt@gmail.com">Email</a>
          <a href="https://github.com/costajohnt">GitHub</a>
          <a href="https://blog.jcosta.tech">Blog</a>
          <a href="testimonials.html">What colleagues say</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>
```

Note: Testimonial content is placeholder. The user will paste their actual LinkedIn recommendations. Each card is self-contained so adding/removing testimonials is trivial.

- [ ] **Step 2: Verify testimonials page renders correctly**

Open `testimonials.html` in browser. Check nav links back to main page sections with `/#oss` and `/#writing` anchors. Check amber left border on testimonial cards.

- [ ] **Step 3: Commit**

```bash
git add testimonials.html
git commit -m "feat: add testimonials page with placeholder content"
```

### Task 8: Update favicon to match warm palette

**Files:**
- Modify: `favicon.svg`

- [ ] **Step 1: Update favicon colors**

Change the background from `#1a1a1a` to the warm near-black `#1c1917` and the text from `#faf9f7` to the warm off-white `#f6f4f0`. Update the font to match the site's Outfit/Lora feel (keep Georgia as it's an SVG favicon and web fonts don't load there).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="#1c1917"/>
  <text x="16" y="21" font-family="Georgia, serif" font-size="14" font-weight="400" fill="#f6f4f0" text-anchor="middle" font-style="italic">JC</text>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add favicon.svg
git commit -m "chore: update favicon colors to match warm palette"
```

---

## Chunk 4: Data Files & Automation Scripts

### Task 9: Create initial data files

**Files:**
- Create: `data/posts.json`
- Create: `data/oss-stats.json`

- [ ] **Step 1: Create `data/` directory**

```bash
mkdir -p data
```

- [ ] **Step 2: Create `data/posts.json`**

Initial data matching the hardcoded HTML. The GitHub Action will overwrite this file daily.

```json
{
  "posts": [
    {
      "title": "Claude Code Tips and Tricks",
      "subtitle": "Practical patterns for AI-assisted engineering from daily use.",
      "date": "2026-03-07",
      "readTime": "7 min",
      "url": "https://blog.jcosta.tech/claude-code-tips-and-tricks"
    },
    {
      "title": "The Biggest Bottleneck in Enterprise Software Isn't Technical",
      "subtitle": "The coordination tax and how to break through it.",
      "date": "2026-03-05",
      "readTime": "6 min",
      "url": "https://blog.jcosta.tech/the-biggest-bottleneck-in-enterprise-software-isnt-technical"
    },
    {
      "title": "Why Functional Programming Is the Most Important Skill for the AI Era",
      "subtitle": "Type-driven design, declarative thinking, and domain modeling.",
      "date": "2026-02-24",
      "readTime": "8 min",
      "url": "https://blog.jcosta.tech/why-functional-programming-is-the-most-important-skill-for-the-ai-era"
    },
    {
      "title": "Why AI-Assisted Development Feels Like Engineering Management",
      "subtitle": "How years of code review prepared me for working with Claude.",
      "date": "2026-01-06",
      "readTime": "3 min",
      "url": "https://blog.jcosta.tech/why-ai-assisted-development-feels-like-engineering-management"
    }
  ]
}
```

- [ ] **Step 3: Create `data/oss-stats.json`**

Initial data matching the hardcoded HTML.

```json
{
  "stats": {
    "prsMerged": 55,
    "repos": "20+",
    "mergeRate": "77%",
    "languages": 6
  },
  "contributions": [
    { "repo": "Homebrew/brew", "url": "https://github.com/Homebrew/brew", "stars": "47k", "prs": 2 },
    { "repo": "ink", "url": "https://github.com/vadimdemedes/ink", "stars": "35.5k", "prs": 15 },
    { "repo": "Dioxus", "url": "https://github.com/DioxusLabs/dioxus", "stars": "35.3k" },
    { "repo": "Directus", "url": "https://github.com/directus/directus", "stars": "34.5k" },
    { "repo": "refined-github", "url": "https://github.com/refined-github/refined-github", "stars": "30.7k", "prs": 2 },
    { "repo": "Biome", "url": "https://github.com/biomejs/biome", "stars": "24k" },
    { "repo": "oxc", "url": "https://github.com/oxc-project/oxc", "stars": "19.9k" },
    { "repo": "Super Productivity", "url": "https://github.com/super-productivity/super-productivity", "stars": "17.9k", "prs": 6 },
    { "repo": "React Spectrum", "url": "https://github.com/adobe/react-spectrum", "stars": "14.9k" },
    { "repo": "Owncast", "url": "https://github.com/owncast/owncast", "stars": "11k", "prs": 7 },
    { "repo": "pypdf", "url": "https://github.com/py-pdf/pypdf", "stars": "9.9k", "prs": 2 },
    { "repo": "isomorphic-git", "url": "https://github.com/isomorphic-git/isomorphic-git", "stars": "8.1k" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add data/posts.json data/oss-stats.json
git commit -m "feat: add initial JSON data files for posts and OSS stats"
```

### Task 10: Create blog posts update script

**Files:**
- Create: `scripts/update-posts.mjs`

- [ ] **Step 1: Create `scripts/` directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create `scripts/update-posts.mjs`**

This script queries the Hashnode GraphQL API for the 4 most recent posts from blog.jcosta.tech and writes the result to `data/posts.json`.

```javascript
// scripts/update-posts.mjs
// Fetches latest blog posts from Hashnode GraphQL API and writes to data/posts.json

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'data', 'posts.json');

const HASHNODE_API = 'https://gql.hashnode.com';
const PUBLICATION_HOST = 'blog.jcosta.tech';

const query = `
  query {
    publication(host: "${PUBLICATION_HOST}") {
      posts(first: 4) {
        edges {
          node {
            title
            subtitle
            slug
            publishedAt
            readTimeInMinutes
            url
          }
        }
      }
    }
  }
`;

async function fetchPosts() {
  let response;
  try {
    response = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    console.error(`Network error fetching from Hashnode: ${e.message}. Keeping existing data.`);
    process.exit(0);
  }

  if (!response.ok) {
    console.error(`Hashnode API responded with ${response.status}. Keeping existing data.`);
    process.exit(0);
  }

  const { data, errors } = await response.json();

  if (errors) {
    console.error(`Hashnode API errors: ${JSON.stringify(errors)}. Keeping existing data.`);
    process.exit(0);
  }

  const edges = data?.publication?.posts?.edges;
  if (!edges || edges.length === 0) {
    console.log('No posts found. Keeping existing data.');
    process.exit(0);
  }

  const posts = edges.map(({ node }) => ({
    title: node.title,
    subtitle: node.subtitle || '',
    date: node.publishedAt.split('T')[0],
    readTime: `${node.readTimeInMinutes} min`,
    url: node.url,
  }));

  return { posts };
}

const data = await fetchPosts();
writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${data.posts.length} posts to ${OUTPUT_PATH}`);
```

- [ ] **Step 3: Test the script locally**

Run: `node scripts/update-posts.mjs`
Expected: writes `data/posts.json` with the latest 4 posts from blog.jcosta.tech. Verify the output contains real post data.

- [ ] **Step 4: Commit**

```bash
git add scripts/update-posts.mjs
git commit -m "feat: add script to fetch blog posts from Hashnode API"
```

### Task 11: Create OSS stats update script

**Files:**
- Create: `scripts/update-oss-stats.mjs`

- [ ] **Step 1: Create `scripts/update-oss-stats.mjs`**

This script queries the GitHub Search API for merged PRs by costajohnt, aggregates stats, and writes to `data/oss-stats.json`.

```javascript
// scripts/update-oss-stats.mjs
// Fetches merged PR stats from GitHub Search API and writes to data/oss-stats.json

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'data', 'oss-stats.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'costajohnt';
const MIN_STARS = 50;

// Nonprofit org names for the "giving back" categorization
const NONPROFIT_ORGS = ['rubyforgood', 'activist-org', 'wikieducationfoundation'];

// Small delay between requests to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function githubFetch(url) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  const response = await fetch(url, { headers });

  // Check rate limit headers
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining && parseInt(remaining) < 10) {
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
    const waitMs = Math.max(0, resetTime - Date.now()) + 1000;
    console.warn(`Rate limit low (${remaining} remaining). Waiting ${Math.round(waitMs/1000)}s...`);
    await delay(waitMs);
  }

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchAllMergedPRs() {
  // Note: GitHub Search API caps at 1000 results. Currently ~55 PRs so this is fine.
  // If contributions exceed 1000, this script will need date-range pagination.
  const prs = [];
  let page = 1;

  while (true) {
    const query = `is:pr+is:merged+author:${USERNAME}+-user:${USERNAME}`;
    const url = `https://api.github.com/search/issues?q=${query}&per_page=100&page=${page}&sort=created&order=desc`;
    const data = await githubFetch(url);
    prs.push(...data.items);

    if (prs.length >= data.total_count || data.items.length < 100) break;
    page++;
    await delay(500); // Respect search API rate limit (30 req/min)
  }

  return prs;
}

async function getRepoStars(repoFullName) {
  const data = await githubFetch(`https://api.github.com/repos/${repoFullName}`);
  return data.stargazers_count;
}

function formatStars(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(count);
}

async function main() {
  console.log('Fetching merged PRs...');
  const prs = await fetchAllMergedPRs();
  console.log(`Found ${prs.length} merged PRs`);

  // Group by repo
  const repoMap = new Map();
  const languages = new Set();

  for (const pr of prs) {
    const repoUrl = pr.repository_url;
    const repoFullName = repoUrl.replace('https://api.github.com/repos/', '');

    if (!repoMap.has(repoFullName)) {
      repoMap.set(repoFullName, { prs: 0, url: `https://github.com/${repoFullName}` });
    }
    repoMap.get(repoFullName).prs++;
  }

  // Fetch star counts for each repo (with delay to avoid rate limits)
  const contributions = [];
  for (const [repoFullName, info] of repoMap) {
    try {
      await delay(200); // Small delay between requests
      const stars = await getRepoStars(repoFullName);
      if (stars >= MIN_STARS) {
        const repoName = repoFullName.includes('/') ? repoFullName.split('/')[1] : repoFullName;
        const displayName = stars >= 5000 ? repoFullName : repoName;
        const entry = {
          repo: displayName,
          url: info.url,
          stars: formatStars(stars),
          starsRaw: stars,
        };
        if (info.prs >= 2) entry.prs = info.prs;
        contributions.push(entry);
      }
    } catch (e) {
      console.warn(`Could not fetch stars for ${repoFullName}: ${e.message}`);
    }
  }

  // Sort by stars descending
  contributions.sort((a, b) => b.starsRaw - a.starsRaw);

  // Remove raw stars from output
  const cleanContributions = contributions.map(({ starsRaw, ...rest }) => rest);

  // Calculate stats
  const totalPRs = prs.length;
  const totalRepos = repoMap.size;
  // Merge rate requires knowing total PRs (including unmerged). Use search API.
  const totalQuery = `is:pr+author:${USERNAME}+-user:${USERNAME}`;
  const totalUrl = `https://api.github.com/search/issues?q=${totalQuery}&per_page=1`;
  const totalData = await githubFetch(totalUrl);
  const mergeRate = Math.round((totalPRs / totalData.total_count) * 100);

  const output = {
    stats: {
      prsMerged: totalPRs,
      repos: totalRepos > 20 ? `${totalRepos}+` : String(totalRepos),
      mergeRate: `${mergeRate}%`,
      languages: 6, // Manually maintained for now: TS, JS, Python, Rust, Ruby, Go
    },
    contributions: cleanContributions,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote stats to ${OUTPUT_PATH}: ${totalPRs} PRs across ${totalRepos} repos (${mergeRate}% merge rate)`);
}

try {
  await main();
} catch (e) {
  console.error(`Failed to update OSS stats: ${e.message}. Keeping existing data.`);
  process.exit(0); // Exit 0 so GitHub Action doesn't show as failed
}
```

- [ ] **Step 2: Test the script locally**

Run: `GITHUB_TOKEN=$(gh auth token) node scripts/update-oss-stats.mjs`
Expected: writes `data/oss-stats.json` with real PR data. Verify the output looks reasonable.

- [ ] **Step 3: Commit**

```bash
git add scripts/update-oss-stats.mjs
git commit -m "feat: add script to fetch OSS stats from GitHub API"
```

### Task 12: Create embed-data script

**Files:**
- Create: `scripts/embed-data.mjs`

This script reads the JSON data files and rewrites the corresponding HTML sections in `index.html`. It uses HTML comment markers to identify the sections to replace.

- [ ] **Step 1: Add HTML comment markers to `index.html`**

Add `<!-- BEGIN:POSTS -->` and `<!-- END:POSTS -->` around the writing list content.
Add `<!-- BEGIN:OSS_STATS -->` and `<!-- END:OSS_STATS -->` around the stats bar content.
Add `<!-- BEGIN:OSS_REPOS -->` and `<!-- END:OSS_REPOS -->` around the repo grid content.

In `index.html`, wrap the relevant sections:

Around the stats bar `<div>` elements (the 4 `<div class="contrib-stat">` blocks):
```html
      <div class="contrib-stats">
        <!-- BEGIN:OSS_STATS -->
        ...existing stat divs...
        <!-- END:OSS_STATS -->
      </div>
```

Around the repo grid `<a>` elements:
```html
        <div class="repo-grid">
          <!-- BEGIN:OSS_REPOS -->
          ...existing repo chips...
          <!-- END:OSS_REPOS -->
        </div>
```

Around the writing list `<a>` elements:
```html
      <div class="writing-list">
        <!-- BEGIN:POSTS -->
        ...existing writing items...
        <!-- END:POSTS -->
      </div>
```

- [ ] **Step 2: Create `scripts/embed-data.mjs`**

```javascript
// scripts/embed-data.mjs
// Reads JSON data files and embeds them into index.html between marker comments

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'index.html');

function readJSON(filename) {
  return JSON.parse(readFileSync(join(ROOT, 'data', filename), 'utf-8'));
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateStatsHTML(stats) {
  return `
        <div class="contrib-stat">
          <div class="number accent-num">${stats.prsMerged}</div>
          <div class="label">PRs Merged</div>
        </div>
        <div class="contrib-stat">
          <div class="number">${stats.repos}</div>
          <div class="label">Repos</div>
        </div>
        <div class="contrib-stat">
          <div class="number green-num">${stats.mergeRate}</div>
          <div class="label">Merge Rate</div>
        </div>
        <div class="contrib-stat">
          <div class="number">${stats.languages}</div>
          <div class="label">Languages</div>
        </div>`;
}

function generateReposHTML(contributions) {
  return contributions.map(c => {
    const prBadge = c.prs ? ` <span class="pr-count">${c.prs} PRs</span>` : '';
    return `          <a href="${c.url}" class="repo-chip">
            <span class="repo-chip-name">${c.repo}</span>
            <span class="repo-chip-meta"><span class="star-icon">&#9733;</span> ${c.stars}${prBadge}</span>
          </a>`;
  }).join('\n');
}

function generatePostsHTML(posts) {
  return posts.map(p => {
    const date = formatDate(p.date);
    return `        <a href="${p.url}" class="writing-item">
          <span class="writing-date">${date}</span>
          <div>
            <h3>${p.title}</h3>
            <p class="subtitle">${p.subtitle}</p>
          </div>
          <span class="writing-time">${p.readTime}</span>
        </a>`;
  }).join('\n');
}

function replaceBetweenMarkers(html, beginMarker, endMarker, newContent) {
  const regex = new RegExp(
    `(<!--\\s*${beginMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`,
    'g'
  );
  return html.replace(regex, `$1\n${newContent}\n        $2`);
}

// Read data
const ossData = readJSON('oss-stats.json');
const postsData = readJSON('posts.json');

// Read current HTML
let html = readFileSync(INDEX_PATH, 'utf-8');

// Embed data
html = replaceBetweenMarkers(html, 'BEGIN:OSS_STATS', 'END:OSS_STATS', generateStatsHTML(ossData.stats));
html = replaceBetweenMarkers(html, 'BEGIN:OSS_REPOS', 'END:OSS_REPOS', generateReposHTML(ossData.contributions));
html = replaceBetweenMarkers(html, 'BEGIN:POSTS', 'END:POSTS', generatePostsHTML(postsData.posts));

// Write back
writeFileSync(INDEX_PATH, html);
console.log('Embedded data into index.html');
```

- [ ] **Step 3: Test the embed script locally**

Run: `node scripts/embed-data.mjs`
Expected: `index.html` is updated in place. Open in browser and verify data still displays correctly. Check that the marker comments are preserved.

- [ ] **Step 4: Commit**

```bash
git add scripts/embed-data.mjs index.html
git commit -m "feat: add embed-data script and HTML markers for automated updates"
```

---

## Chunk 5: GitHub Actions Workflows

### Task 13: Create blog posts update workflow

**Files:**
- Create: `.github/workflows/update-posts.yml`

- [ ] **Step 1: Create `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/update-posts.yml`**

```yaml
name: Update Blog Posts

on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM UTC
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: write

jobs:
  update-posts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch latest posts from Hashnode
        run: node scripts/update-posts.mjs

      - name: Embed data into HTML
        run: node scripts/embed-data.mjs

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/posts.json index.html
          if ! git diff --staged --quiet; then
            git commit -m "chore: update blog posts data"
            git pull --rebase
            git push
          fi
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/update-posts.yml
git commit -m "feat: add GitHub Action to update blog posts daily"
```

### Task 14: Create OSS stats update workflow

**Files:**
- Create: `.github/workflows/update-oss-stats.yml`

- [ ] **Step 1: Create `.github/workflows/update-oss-stats.yml`**

```yaml
name: Update OSS Stats

on:
  schedule:
    - cron: '0 7 * * *' # Daily at 7 AM UTC (1 hour after posts)
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: write

jobs:
  update-oss-stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch OSS contribution stats
        run: node scripts/update-oss-stats.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Embed data into HTML
        run: node scripts/embed-data.mjs

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/oss-stats.json index.html
          if ! git diff --staged --quiet; then
            git commit -m "chore: update OSS contribution stats"
            git pull --rebase
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/update-oss-stats.yml
git commit -m "feat: add GitHub Action to update OSS stats daily"
```

---

## Chunk 6: Assets & Final Polish

### Task 15: Create social card image

**Files:**
- Create: `assets/social-card.png`

- [ ] **Step 1: Create `assets/` directory**

```bash
mkdir -p assets
```

- [ ] **Step 2: Generate social card using HTML screenshot**

Create a temporary HTML file, screenshot it at 1200x630, and save as PNG.

Create `assets/social-card-template.html` (temporary, do not commit):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&family=Lora:ital@1&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      background: #f6f4f0;
      font-family: 'Outfit', sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px 100px;
    }
    h1 {
      font-size: 72px;
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: #1c1917;
      margin-bottom: 24px;
    }
    h1 .italic { font-family: 'Lora', serif; font-style: italic; font-weight: 400; }
    h1 .accent { color: #b45309; }
    p {
      font-size: 28px;
      color: #57534e;
      font-family: 'Lora', serif;
    }
    .bar {
      position: absolute;
      bottom: 60px;
      left: 100px;
      right: 100px;
      height: 3px;
      background: linear-gradient(90deg, #b45309, #15803d);
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <h1>Builder, <span class="italic">engineer,</span><br><span class="accent">product thinker.</span></h1>
  <p>jcosta.tech</p>
  <div class="bar"></div>
</body>
</html>
```

Open this file in Chrome at exactly 1200x630 viewport (DevTools > device toolbar > set to 1200x630), then screenshot with Cmd+Shift+P > "Capture full size screenshot". Save as `assets/social-card.png`. Delete the template HTML file after.

- [ ] **Step 3: Commit**

```bash
git add assets/social-card.png
git commit -m "feat: add social card image for og:image"
```

### Task 16: Record oss-autopilot dashboard video

**Files:**
- Create: `assets/oss-autopilot-dashboard.mp4`

- [ ] **Step 1: Record a screen capture of the dashboard (skip if unavailable)**

**If the oss-autopilot dashboard is running locally:**
1. Open the dashboard at `http://localhost:3000` (dark theme)
2. Use macOS screen recording (Cmd+Shift+5 > Record Selected Portion) or QuickTime
3. Record 10-15 seconds: loading, scrolling, filtering
4. Export as MP4, compress for web: `ffmpeg -i input.mov -vcodec h264 -an -s 960x600 -b:v 800k assets/oss-autopilot-dashboard.mp4`
5. Target under 2MB file size

**If the dashboard is NOT available:** Skip this task entirely. The placeholder text in the HTML will remain. This task can be completed independently later by replacing the placeholder `<div class="oss-img-text">` with the `<video>` element shown in Step 2.

- [ ] **Step 2: Update oss-autopilot card in `index.html` to use the video**

Replace the placeholder text with a `<video>` element:

```html
          <div class="oss-img">
            <video autoplay loop muted playsinline>
              <source src="assets/oss-autopilot-dashboard.mp4" type="video/mp4">
            </video>
          </div>
```

- [ ] **Step 3: Verify the video plays correctly**

Open `index.html` in browser. The video should autoplay silently, loop, and cover the card image area.

- [ ] **Step 4: Commit**

```bash
git add assets/oss-autopilot-dashboard.mp4 index.html
git commit -m "feat: add looping dashboard video to oss-autopilot card"
```

### Task 17: Final accessibility and responsive check

**Files:**
- Modify: `styles.css` (if fixes needed)
- Modify: `index.html` (if fixes needed)

- [ ] **Step 1: Check WCAG contrast for amber accent**

Verify that `#b45309` (amber) on `#f6f4f0` (background) meets WCAG AA for normal text (4.5:1 ratio). Use a contrast checker tool. If it fails, darken the amber slightly and update the CSS variable.

- [ ] **Step 2: Test keyboard navigation**

Tab through the page. Verify all links and interactive elements receive a visible focus ring (the `:focus-visible` styles added in `styles.css`).

- [ ] **Step 3: Verify content guidelines from design spec**

Review all copy against spec content guidelines: full sentences only, no em dashes, no monospace fonts, lead with what John does not his tech stack.

- [ ] **Step 4: Test responsive breakpoints**

Test at 860px (tablet) and 480px (mobile). Verify:
- Hero stacks to single column with visual above text
- Value cards stack vertically
- Stats bar wraps to 2x2
- Repo chips stack to single column
- Project cards stack to single column
- Writing items collapse to single column (date above title, read time hidden)
- Nav stacks vertically on mobile
- Footer centers and stacks

- [ ] **Step 5: Commit any fixes**

```bash
git add styles.css index.html
git commit -m "fix: accessibility and responsive refinements"
```

### Task 18: Create PR

- [ ] **Step 1: Push branch and create PR**

```bash
git push -u origin redesign-site
gh pr create --title "Redesign site as primary professional presence" --body "$(cat <<'EOF'
## Summary
- Complete redesign of jcosta.tech with warm editorial aesthetic (Outfit + Lora, amber/green accents)
- Hero section with builder/engineer/product thinker positioning
- Open Source section: contribution stats, notable repos grid, project cards
- Writing section with 4 most recent blog posts
- Testimonials page (placeholder content for LinkedIn recommendations)
- GitHub Actions for daily automated updates (blog posts from Hashnode, OSS stats from GitHub API)
- Social card and dashboard video assets

## Test plan
- [ ] Verify all sections render correctly on desktop
- [ ] Test responsive layout at 860px and 480px breakpoints
- [ ] Verify keyboard navigation and focus states
- [ ] Check WCAG contrast for amber accent text
- [ ] Manually trigger both GitHub Actions workflows
- [ ] Verify blog post links resolve to real Hashnode URLs
- [ ] Verify OSS repo links resolve to real GitHub repos

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Verify PR was created successfully**

Check the output URL and confirm the PR appears on GitHub.
