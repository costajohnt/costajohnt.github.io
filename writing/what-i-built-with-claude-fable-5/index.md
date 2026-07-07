---
title: "What I Built with Claude Fable 5"
subtitle: "An audit of everything I own, a dictation app, and the division of labor that stuck"
date: 2026-07-07
readTime: 4
cover: "/assets/covers/what-i-built-with-claude-fable-5.png"
tags: ["ai", "claude-code", "ai-assisted-development", "agentic-ai", "automation", "open-source", "developer-tools", "home-lab", "ai-agents"]
seoTitle: "What I Built with Claude Fable 5"
seoDescription: "A show and tell of a week with Claude Fable 5: a whole-fleet audit, nine merged PRs, a local macOS dictation app, and a PR-history miner, with the frontier model planning and cheaper models executing."
---
Anthropic shipped Claude Fable 5, the first model in a new tier that sits above Opus. I got a window of heavy access to it, and instead of handing it tickets I handed it everything I own. This is a show and tell of what came out of it.

What makes it different is altitude. The models before it were already excellent executors. Fable is the first one that felt clearly better at the level above that. It plans well, it keeps track of a sprawling amount of state without losing the plot, and it dispatches subagents to implement parts of its own plan while it stays at the system level. It also surfaced problems and feature ideas in my projects that passes with Opus and Sonnet never mentioned. That's a qualitative read, and it held up across project after project.

## The audit sweep

The first thing I did was point it at eight of my repos and my whole homelab in a single recon pass: bugs, security issues, refactor opportunities, feature ideas, test gaps, ranked by severity and effort. The output was one worklist with 178 findings. Among them: a failing drive in the media server whose backup chain was already silently broken behind it, and live credentials sitting in unpushed commits on an old project. Both surfaced unprompted.

## The fix wave

Fable wrote the plans and dispatched execution to cheaper models: nine merged PRs across five repos plus a new npm release. The homelab came out more robust, with backups hardened and verified, the disk watchdog re-armed, dead entities cleaned out of Home Assistant, and a handful of security posture fixes.

My little trading system got the most interesting single result. Fable designed its first proper walk-forward out-of-sample test, and the test revealed that the parameters running live were the worst of the candidates. The config got replaced with the one the data blessed. I trusted the test it built, which is a very different thing from trusting the model's own judgment.

## Murmur

I also wanted to see what it could do greenfield, so I built [Murmur](https://github.com/costajohnt/murmur), a local dictation app for macOS, in one session, with the usual arrangement flipped: Opus held the plan and Fable subagents did the typing. It's a small floating pill at the bottom of the screen: click, talk, and the transcript lands at your cursor in whatever app you're in. Transcription runs on the Neural Engine, optional cleanup runs through a local LLM, and nothing ever leaves the machine. v1.0.0 is public and MIT licensed.

I talk to my coding agents constantly, and I wanted the speech-to-text leg of that loop as local and private as the rest of my setup.

## prlore

[prlore](https://github.com/costajohnt/prlore) mines a repo's PR review history into an AGENTS.md conventions file, so the tribal knowledge buried in old review threads becomes something a coding agent can read. Fable drove the v0.3.0 quality release: floors so one-off review trivia can't become a rule, penalties for rules too repo-specific to travel, deduplication, and tiered output for big repos. On one large OSS repo, that turned a 44KB monolith into a 31KB root file plus five small per-area files.

## What I couldn't do before

A lot of this I could not have pulled off a month ago. The earlier models wrote perfectly good code, but they lost the thread on anything this sprawling. Fable held it. It kept a whole worklist, a homelab, and a handful of repos in its head at once, decided what mattered, and handed the busywork down to cheaper models. The expensive model is worth it for judgment and orchestration; most of the work below that line runs fine without it.

All of it ran on the [same setup](https://jcosta.tech/writing/always-on-claude-home-lab-node/) I've written about before: the skills and instructions that guide the agents, the [persistent memory](https://jcosta.tech/writing/how-i-give-claude-code-a-persistent-brain-in-obsidian/) they share across sessions, and now a local voice loop to drive it. Fable took the whole thing as it was and used it better than anything before it.
