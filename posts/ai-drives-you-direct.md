---
title: "AI Drives, You Direct"
subtitle: "How I finally started getting PRs merged"
date: 2026-01-20
readTime: 2
cover: "/assets/covers/ai-drives-you-direct.png"
tags: ["AI", "Open Source", "claude-code", "Productivity", "Developer Tools", "agentic AI", "llm", "GitHub"]
seoTitle: "AI Drives, You Direct: How I Finally Got PRs Merged"
seoDescription: "How I built oss-autopilot to handle the tedious parts of open source contribution using Claude Code's agentic capabilities. Six PRs merged in weeks."
hashnodeUrl: "https://blog.jcosta.tech/ai-drives-you-direct"
---

I've tried contributing to open source before. It's a lot of work, and when your PRs aren't getting traction, it's easy to give up.

## Building oss-autopilot

I've [written before](https://blog.jcosta.tech/why-ai-assisted-development-feels-like-engineering-management) about how AI-assisted development feels like engineering management. Directing, reviewing, course correcting. That framing got me thinking: what if I could build tooling that handles the tedious parts of open source, and I just direct?

That's [oss-autopilot](https://github.com/costajohnt/oss-autopilot).

It tracks all my open PRs and fetches comments so I know when someone's waiting on me. It keeps a history of my contributions, which repos I've had success with, which ones have ignored me. When I'm looking for something new to work on, it searches for issues but filters them through that history. It steers me toward repos with active maintainers who've actually merged my stuff before.

When a maintainer leaves feedback on one of my PRs, it reads the comment and the relevant code and drafts a response. I review it, tweak it if needed, and approve it before anything gets posted. My reputation stays in my hands.

The whole thing runs through Claude Code. I type `/oss` and it goes to work. Checks my PRs, pulls in new comments, finds opportunities, drafts responses. I review what it surfaced and make decisions. That's it.

## What changed

In the past few weeks I've had six PRs merged. I do most of this while playing Fortnite in the evenings.

The difference isn't that I got better at coding. It's that I stopped guessing and losing track of things. The tool remembers what I'd forget. I just make the calls.

## The agentic shift

Tools like Claude Code are agentic now. They can take initiative, not just respond. They can check on things, fetch data, draft responses, keep track of state. That's a real capability shift.

The interface has changed too. You chat with Claude Code in plain English. Tell it what you want, and it goes off and does the work. That's it. No complex commands, no context switching between tools. Just conversation.

But most people still use AI the old way. You ask, it answers. You lead, it follows. That works, but it leaves a lot on the table.

The opportunity is building tooling that actually uses the agentic capabilities. Give Claude enough context and access to drive things forward on its own. Then you direct instead of do.

That's what oss-autopilot is for me. Yours might look different. But the principle is the same: if your AI can take initiative, build tooling that lets it.

---

*[oss-autopilot](https://github.com/costajohnt/oss-autopilot) is open source if you want to try it or build something similar.*

