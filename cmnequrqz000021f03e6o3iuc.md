---
title: "Building a Self-Improving Trading System With AI"
seoTitle: "Building a Self-Improving Trading System With AI Agents"
seoDescription: "I built a trading bot that edits its own code. An AI agent reviews performance weekly, runs backtests, and deploys strategy changes within hardcoded s"
datePublished: 2026-03-31T15:00:00.000Z
cuid: cmnequrqz000021f03e6o3iuc
slug: building-a-self-improving-trading-system-with-ai
cover: https://cdn.hashnode.com/uploads/covers/62fdd4ef1ebeafdc3d32f72e/35b09890-fe4b-468c-95d5-226fca354cc1.png
ogImage: https://cdn.hashnode.com/uploads/og-images/62fdd4ef1ebeafdc3d32f72e/de91447d-b99b-4480-b9eb-3d5178150b98.png
tags: python, trading, safety, github-actions, ai-agents, autonomous-agents

---

I built an automated paper trading system. Then I gave it an AI agent that reviews its own performance and deploys improvements. Here's what that looks like in practice, and what I learned about giving an AI real autonomy over a system that matters.

## The System

The trading system runs on Alpaca's paper trading API. It combines four strategies: mean reversion with weekly trend confirmation, AI-powered news sentiment, Finnhub insider trading signals, and momentum detection. Every trade goes through three layers of analysis before execution. Position sizing is conviction-based and capped. Sector exposure is tracked and limited.

It runs twice daily via GitHub Actions. The pipeline manages exits first, then scans for new opportunities across 11K+ equities, and logs everything to CSV for analysis later.

None of this is novel. Retail algo trading has been a popular hobby project for years. What made it interesting to me was the next step.

## The Agent

Once the system was stable and generating data, I added an autonomous strategy agent. It's Claude Opus 4.6 running through OpenRouter, triggered weekly by a separate GitHub Actions workflow.

The agent has a structured reasoning process: observe performance data, compare against previous changes, diagnose the biggest problem, validate a fix via backtesting, and either deploy or wait. It can modify strategy parameters, adjust filters, create shadow experiments, and roll back failures.

This is the part where most people get nervous. An AI modifying production code autonomously? On a system that trades real money (well, paper money)?

Fair concern. Here's how I handled it.

## The Safety Architecture

The agent has tools. Those tools have hardcoded constraints that the agent cannot override, because they live in a file the agent cannot modify.

Minimum sample sizes are enforced at the tool level, not the prompt level. The agent can't deploy a parameter change unless there are at least 50 trades worth of data backing the decision. It can't modify filters without 30 data points. These aren't suggestions in a system prompt. They're Python assertions that throw errors.

The agent can't touch its own code, the risk guard, the resilience layer, tests, or workflows. It gets a maximum of 2 deploys per week. Any file it changes enters a 14-day cooling period before it can be changed again. All tests must pass before any deploy goes through.

Position size is capped at 5% of equity. The max-loss stop can never be disabled. These are hardcoded constants, not configurable parameters.

If the agent's run ends without it calling `log_decision` (because of an API error or hitting the turn limit), the system forces a minimal log entry. Every run produces an audit trail.

If the changelog file is corrupt, the agent halts entirely. It doesn't try to recover or start fresh. A corrupt changelog means something unexpected happened, and the right response is to stop and let a human look at it.

## What I Learned

**The prompt is not the safety layer.** Early on, I had safety rules in the system prompt: "never exceed 50 trades minimum sample size." That's a suggestion. The model can ignore it, misinterpret it, or forget it in a long conversation. The real safety layer is the code that executes the tools. If the tool throws an error when you try to deploy without enough data, it doesn't matter what the model thinks.

**Shadow experiments are underrated.** The agent can create experiments where it logs what a parameter change *would* have done without actually changing anything. This lets it gather evidence before committing to a change. Most of the time, the right decision is to wait and observe. Giving the agent a structured way to "wait and observe" prevents it from deploying premature changes just because it feels like it should do something.

**First run behavior matters.** I had to explicitly handle the case where the agent runs for the first time and there's no historical data. Without guidance, it would try to "fix" the lack of data by deploying changes. The system prompt now says: if this is your first run, establish a baseline and do NOT make changes. And the minimum sample size enforcement backs this up at the tool level.

**Atomic operations everywhere.** Every file write goes through `tempfile.mkstemp()` + `os.replace()`. If the process crashes mid-write, you get either the old file or the new file, never a half-written one. This matters more than you'd think when you have concurrent GitHub Actions runs writing to the same repository.

**The git push race condition.** Two cron schedules can overlap if one runs long. The first run pushes, the second run's push gets rejected. I lost a day's worth of state data before adding `git pull --rebase` before every push in the workflow. Boring problem. Real consequence.

## The Engineering Management Parallel

I've [written before](https://blog.jcosta.tech/why-ai-assisted-development-feels-like-engineering-management) about how AI-assisted development feels like engineering management. This project made that analogy feel very literal.

The strategy agent is like a junior developer with good instincts but no judgment about when to act. The safety rails are the code review process. The minimum sample sizes are the "show me the data" conversations. The cooling period is the "let's see how the last change lands before making another one."

I still review its changelog. I still check what it deployed. I still override it when I disagree. But I don't have to be there for every decision. That's the point.

## The Stack

For anyone curious:

- **Trading**: Alpaca API (paper trading), Python, pandas
- **Strategies**: Mean reversion, sentiment (via OpenRouter), insider signals (Finnhub), momentum
- **Agent**: Claude Opus 4.6 via OpenRouter, OpenAI-compatible SDK
- **Infrastructure**: GitHub Actions (daily pipeline + weekly agent review)
- **Safety**: Hardcoded tool constraints, atomic writes, walk-forward backtesting with holdout validation
- **Tests**: 654 tests across 30 files

The whole thing runs on free-tier GitHub Actions. No servers to maintain. The project is [open source](https://github.com/costajohnt/alpaca-trader).

## Is It Making Money?

Not yet. It's paper trading, and the portfolio is down about 3% over its first six weeks. The agent hasn't deployed any live parameter changes because it hasn't hit the minimum sample sizes required to justify one. That's the correct behavior.

What it has done is run shadow experiments. It noticed that positions were showing poor risk/reward asymmetry (6% take-profit vs 12% stop-loss) and created an experiment to test tighter trailing stops without actually changing anything in production. It also paused the screener strategy entirely after the win rate dropped below 30%, which is exactly the kind of tactical decision it's designed to make.

So the system is working as intended. It's observing, gathering data, making small low-risk moves, and waiting for evidence before committing to real changes. It's not making money, but it's not supposed to yet.

The idea is that over time, as it accumulates enough trades and enough data, it starts proving gains in paper trading. If it can demonstrate consistent improvement over months of autonomous operation, then maybe it earns the right to trade with real money. That's the experiment.
