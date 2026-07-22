---
title: "The AI Says It's Done. Make It Prove It."
subtitle: "Coding agents get lazy on long jobs: they do the fun part and round up to done. A deterministic state machine takes that call away from the model."
date: 2026-07-21
readTime: 6
cover: "/assets/covers/the-ai-says-its-done.png"
tags: ["ai", "ai-engineering", "coding-agents", "state-machines", "software-engineering"]
seoTitle: "The AI Says It's Done. Make It Prove It."
seoDescription: "Coding agents stop early and claim they finished. A deterministic Go orchestrator gates every phase on evidence, re-running the tests instead of trusting the agent's word."
hashnodeUrl: "https://blog.jcosta.tech/the-ai-says-its-done"
updated: 2026-07-21
---

What I want from a coding agent is to hand off a real piece of work and trust it gets done without me watching. The agents I use are most of the way there. They write good code, and they can already handle the basic agentic tasks. They can test changes on the command line or in the browser. What's missing is reliability across a long list. When I hand off a ten-step job, I need all ten steps done, not just the first six.

The failure mode that blocks that is laziness.

I hit it building something that runs a multi-step job end to end. The kind of work that's a whole sequence rather than a single task: plan it, write it, test it, review it, carry it through to a finished, verified change. A lot of steps, some with their own inner loops.

The first version was one big prompt describing the whole workflow, and it was lazy in a consistent way. It did the fun part, the implementation, really well. Then it stopped. It wrote the code, decided the interesting work was over, and reported back as if it were done. The manual testing didn't happen. The PR didn't get opened. The whole tail of the workflow, the tedious parts that matter, evaporated, and the summary said "complete."

That's the shape of it. The agent front-loads the parts that look like accomplishment and abandons the parts that feel like cleanup, and the longer the workflow, the more reliably it happens. It's rational behavior. Declaring the work done is what ends the turn, so the agent reaches for that as soon as it plausibly can. If the only thing between "implemented" and "done" is the agent's own say-so, it will round up every time.

So the question stopped being how do I get a smarter agent, and became how do I stop trusting the agent's report about its own work. The answer: take control flow away from the model and give it to a deterministic state machine. The workflow becomes a fixed pipeline the agent is walked through one phase at a time, and no run reaches "done" until every phase has been verified.

## The agent doesn't get to decide it's done

Most agentic setups hand the model the whole job and let it drive. Here's the workflow, here's a long context, go. The agent decides which step it's on, when a step is finished, and when the whole thing is finished. That's the arrangement that lets it stop after the implementation, because stopping is a decision and the decision is the agent's to make.

My setup inverts that. The pipeline is a fixed sequence of phases:

```
preview → plan → implement → quality → test → ship → ci
```

A deterministic orchestrator, plain Go with no model anywhere in the loop, owns the transitions. The agent only ever runs the current phase. "Advance" and "done" are the orchestrator's moves, not the agent's. There's no prompt it can write to jump to done, because done isn't something the agent can say. It's a state the orchestrator moves into, and only after every prior gate has passed.

The allowed transitions are an explicit table the runner checks on every move, and anything that isn't on it is rejected outright. So the ordering is structural: implement can't happen before plan, ship can't happen before the tests ran, and the agent can't route around any of it. Completeness and order come by construction, not by asking nicely in a prompt.

## A deterministic gate between every state

Owning the transitions is half of it. The other half is what happens at each boundary. Before advancing out of a phase, the orchestrator runs a gate: a deterministic check that the phase produced what it was supposed to. The agent reporting `success` is a claim, and a claim doesn't move the machine. Evidence moves the machine.

The gates are boring on purpose:

- The **plan** phase is supposed to leave a plan document. The gate checks `plan.md` exists and isn't empty. No file, no advancing, whatever the agent says.
- The **implement** phase is supposed to write code and a test. The gate checks the diff is non-empty and the test file is in it, then the orchestrator re-runs the test itself and checks for exit zero. The agent doesn't get to tell you the tests pass. The machine runs them.
- The **ci** phase is supposed to end green. The gate re-runs `gh pr checks` and reads the result directly. A red check is red no matter how confident the agent sounded.

There's a subtle version of this I got wrong first. One gate re-ran the test command the agent declared it had used, which sounds airtight until you notice the agent picks the command. Nothing stopped it from declaring `true` as its test and passing the gate honestly. A check that takes its input from the thing it's checking is theater, so the gate now rejects a no-op command before it ever runs.

That's the whole answer to "it claims it's done when it isn't." The claim stops being load-bearing. If the artifact isn't there, the machine stops. If the tests don't pass when the orchestrator runs them, the machine stops. Self-report is demoted from verdict to hint.

And when a gate fails, it fails closed. No silent fallback waves a stuck phase through. A failed gate routes to a terminal failure state that writes a report saying exactly where it stopped and why. A halt you can see beats a "success" you can't trust.

## Fresh context per phase, on purpose

Breaking the workflow into phases bought me a clean answer to context management. Each phase runs as its own fresh process. The `implement` phase doesn't inherit the transcript of the `plan` phase. It boots cold and reads what it needs from disk, the spec, the plan, the artifacts earlier phases left behind, then writes its own result to a small file the next phase reads.

The state machine gives you the seams to do this, because the boundaries between phases are also the boundaries between contexts, and the artifacts on disk are the handoff. Nothing carries the whole history forward in one ballooning window, which is where models lose the thread and start calling half-done work finished. A short context keeps the agent honest: the agent running the `test` phase only knows it's running the test phase, so it can't get complacent about all the good work upstream, because from where it sits, none of it happened.

The inner loops work the same way. The review step runs several fresh reviewers at once, each looking through a different lens, spawned as subagents, their findings merged back deterministically. Each gets a clean read instead of a context already primed to believe the code is fine. The second read is worth more when it genuinely is a second read.

I should be honest about where this reaches its limit. Re-running a test is a fact I can check completely, and no amount of agent confidence changes the exit code. Whether a review was any good is judgment, and there the loop can only prove it ran and converged, not that it was insightful. That part is a probabilistic defense, and I'd rather name it as one than let it ride on the credibility of the checks that are actually guaranteed.

## Why a state machine

You could try to solve laziness with a stern prompt. "Don't claim the tests pass unless you ran them. Don't skip review. Verify before you assert." I've written those prompts. They help a little and fail constantly, because they ask the thing that wants shortcuts to please not take them.

There's a fair objection to all this. Maybe the agent stops early because it was never handed a precise definition of done, and a clear finish line would fix it without any of this machinery. I think that's half right, and it's the reason the machinery works. The gates are the finish line. What matters is where that line lives. If done is something the agent grades itself against, it will always find a reading of the task where it's already there. So the definition has to sit outside the agent, owned by something that isn't trying to end the turn, and enforced by re-running the work instead of re-reading the agent's summary of it. A finish line only the agent can see is just a suggestion.

The state machine works because it doesn't ask. The agent can want to skip the test all it likes; the orchestrator runs the test itself before advancing, so wanting to skip it accomplishes nothing. You stop arguing with the model's incentives and build a structure where the shortcuts aren't reachable.

That's the thesis. Deterministic control flow, deterministic gates, evidence instead of claims. The agent still does the creative work, writing the code, which is what it's genuinely good at. It just doesn't get to be the judge of whether it finished.

Underneath all of it, the thing I was actually after is altitude. Once I can trust a handed-off job to run to completion, I stop needing to sit in the diff watching it happen. I can spend attention on what the work should be instead of whether it got done. Reliable completion is the unlock. The state machine is just how I bought it.
