---
title: "Automate Your Life With Cron Jobs, GitHub Actions, and Telegram"
subtitle: "Scheduled jobs, free tools, and a little AI can quietly run a surprising amount of your life"
date: 2026-03-26
readTime: 3
cover: "/assets/covers/automate-your-life-with-cron-jobs-github-actions-and-telegram.png"
tags: ["automation", "github-actions", "telegram", "ai", "cron-jobs", "claude-code"]
seoTitle: "Automate Your Life With Cron Jobs and GitHub Actions"
seoDescription: "Trade alerts, bounty hunting, a self-updating website, and Claude Code from your phone. All running on GitHub Actions free tier with Telegram notifications."
hashnodeUrl: "https://blog.jcosta.tech/automate-your-life-with-cron-jobs-github-actions-and-telegram"
---

I check my phone in the morning and there are two Telegram messages waiting. One is a summary of trades a bot made overnight. The other is a heads-up that a new open source bounty just got posted.

I didn't set an alarm or check a dashboard. A few scheduled jobs and a Telegram bot handle all of this, running on GitHub Actions free tier. No servers or hosting costs.

Here's what I've built with that setup.

## Trade notifications (and a bot that improves itself)

I have an automated trading system that runs on Alpaca's paper trading API. A cron job runs the trading pipeline twice a day on GitHub Actions. When it finishes, it sends me a Telegram message with what it did.

The more interesting part is a separate weekly job. Once a week, an AI agent reviews the bot's performance, looks at what's working and what isn't, and if it finds a justified improvement, it actually modifies the trading strategy and deploys the change. The bot is tweaking its own code based on how it performs.

There's a lot of safety architecture around that part (full post on this coming soon). But the trigger for all of it is just a cron schedule in a config file.

## Bounty alerts

Open source bounties are GitHub issues with cash rewards attached. Anyone can work on them, but you usually need to claim the issue first. Popular ones get grabbed fast.

I built a tool that polls GitHub and Algora every few minutes for new bounty issues matching my watchlist. When one appears, Telegram buzzes. Seeing a bounty 5 minutes after it's posted vs. 5 hours later is often the difference between getting it and not.

There's also an AI-assisted mode that investigates the codebase and drafts a proposal when I decide to go after one. But the core of it is just a polling script and a Telegram message.

## A website that updates itself

I rebuilt my personal portfolio site as plain HTML. No frameworks, no build step. But it has a [data pipeline behind it](https://blog.jcosta.tech/your-portfolio-site-deserves-a-pipeline).

A daily cron job pulls my latest blog posts from Hashnode and my open source contribution stats from GitHub. If anything changed, it updates the HTML and commits. There's also a webhook path for real-time updates when I publish, but the cron job is the safety net for when webhooks fail.

I published a blog post last week and didn't think about my portfolio at all. The next morning, it was already there.

## Claude Code from your phone

This one isn't a cron job, but it fits the theme.

Claude Code has a feature called Channels that connects a running session to a Telegram bot. Once paired, you message Claude from your phone and it works with your actual dev environment. Files, terminal, tools. It replies back in Telegram.

Your machine needs to stay on, but as long as it does, you've got a dev environment in your pocket.

## The pattern

Something runs on a schedule. It does useful work. It tells you about it, or just handles it quietly.

You don't need to understand cron syntax or YAML deeply. Describe what you want to an AI and it'll help you wire it up. The hardest part is the idea. Once you build your first one and your phone buzzes with something useful that happened while you weren't looking, you start seeing them everywhere.


