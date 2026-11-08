---
title: "How to Become a Top Contributor to an Open Source Project"
subtitle: "Ink went from 18 of my merged PRs to 60. The process is repeatable."
date: 2026-11-08
readTime: 4
cover: "/assets/covers/top-oss-contributor.png"
tags: ["open-source", "ai", "claude-code", "coding-agents", "ink"]
seoTitle: "How to Become a Top Contributor to an Open Source Project"
seoDescription: "How I became Ink's second-largest contributor: pick projects for the reviewer, earn trust with small PRs, turn review feedback into agent guardrails, and widen your scope."
---

In April I wrote about [my first 100 merged open source PRs](https://jcosta.tech/writing/100-merged-prs-what-i-learned-contributing-to-open-source-with-ai/). Ink had 18 of them, and I was its third most active contributor.

It has 60 now. That makes me the second-largest contributor in the project's history, behind Sindre Sorhus and just ahead of Vadim Demedes, who created it. Ink is React for the terminal. It runs underneath Claude Code, Gemini CLI, GitHub Copilot CLI, and Shopify's CLI, and it gets downloaded about 9.9 million times a week.

The path there is repeatable.

## Pick the reviewer first

The person reviewing your PRs decides whether they land. Look for a project where reviews happen within days, the maintainer explains what they want, and issues come with enough detail to reproduce.

oss-autopilot runs that search for me. It scores every repo on how likely a PR is to merge. It checks how active the project is, how fast maintainers review, how often outside PRs land, and whether someone already claimed the issue.

The first issue it surfaced for me was in Ink. I'd never used it. Everything I know about Ink I learned from inside the codebase, one issue at a time.

## Earn trust one small PR at a time

Sindre merged every one of my 60 PRs, and most landed with zero to three comments. That came from learning what he wants. He wants one change per PR, a test that fails without it, and a description that explains the mechanism.

The best descriptions read like a bug report followed by a proof. Show the input, what the main branch does with it, what it should do, and why your fix is the smallest correct one. When the reviewer can verify the claim from the description alone, the review goes to the design.

Small PRs earn the trust big ones need. My largest, kitty keyboard protocol support, ran about 1,700 lines and took many rounds of review. Sindre stuck with me through all of them.

Persistence matters as much as the code. A PR that goes a week without a reply or a rebase looks abandoned. oss-autopilot tracks every PR I have open and flags the ones waiting on me, which I covered in the April post.

## Turn review feedback into guardrails

Claude Code writes most of my code. I test and review every change before it goes up. Left alone, an agent repeats the mistakes every new contributor makes.

In April I said the goal was for maintainers never to give me the same feedback twice. prlore is how I got there. It mines a repo's PR history, pulls out the comments a maintainer makes again and again, checks them against the current code, and writes them up as a rulebook an agent can read. For Ink that came to about 200 rules from two years of reviews. The agent reads them before it writes code, and a review step checks every change against them before I open a PR.

The rulebook only works if something forces the lookup. Once we signed off on a change and Sindre broke it the same day. The rulebook already had a rule for exactly that shortcut. Checking it is now a required step. Every miss becomes a check.

Some rules went back upstream. A few of Sindre's most repeated comments were mechanical enough to test, so I added a check to Ink's test suite. The next contributor hears it from CI instead of from him.

## Widen your scope

Early on, everything I picked up was a bug someone else had reported. As I invested more in the project, I started finding my own work. I use Claude to audit the whole repo for edge cases nobody has filed yet. Many of my recent fixes came from those audits, including one that stopped a transform component from writing raw escape sequences straight to the terminal.

The same shift pulled me into upkeep. I added a weekly Windows run of the test suite. I answer questions in issues and discussions, triage new reports, and review other contributors' PRs.

Fixes help users. Upkeep helps the maintainer, whose time is the scarcest thing in any popular project.

Getting your first PR into a project is hard. Getting your sixtieth is a partnership.

[oss-autopilot](https://github.com/costajohnt/oss-autopilot) and [prlore](https://github.com/costajohnt/prlore) are open source, and everything that shipped in the latest Ink major is in the [8.0.0 release notes](https://github.com/vadimdemedes/ink/releases/tag/v8.0.0).
