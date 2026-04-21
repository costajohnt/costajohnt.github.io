---
title: "Your Team Needs a Code Review Canon"
datePublished: Tue Apr 21 2026 15:39:10 GMT+0000 (Coordinated Universal Time)
cuid: cmo8sh9nn000002i93nc0e0so
slug: code-review-canon
canonical: https://jcosta.tech/writing/code-review-canon/
cover: https://jcosta.tech/assets/covers/code-review-canon.png
tags: ai, code-review, software-engineering, engineering-management, team-practices

---


You finish your code change, go through several rounds of self-review and testing, fix issues, and get CI passing. You have a polished piece of work that's ready to go.

You put it up for review, and nothing happens. Maybe for several days. You ping the team in Slack asking for a review. Still nothing. You start reaching out to colleagues directly, almost asking for a favor. Meanwhile the business is expecting this work. You've moved on to another task because you're blocked, and now you're juggling multiple open stories at the same time. Across the team, there's a backlog of open PRs in various states, and everyone is in the same position.

This is the pattern on every team that treats code review as an informal, "look at PRs when you can" process. Work piles up in a single state. Developers take on more work because they're blocked on the last thing, which means more context switching, which means lower quality on everything. The cognitive load of juggling multiple half-finished tasks is real, and it compounds across the whole team.

## The Problem

The bottleneck is bad enough, but it gets worse when you look at what happens once the review actually starts.

**Nobody knows what "approved" means.** Without agreed-upon standards, each reviewer applies their own mental checklist. One person cares about test coverage, another cares about naming conventions, a third cares about architectural patterns. The developer has no way to predict what will come back, which makes estimates harder and makes the whole process feel arbitrary.

**Personal preference becomes indistinguishable from code quality.** When a reviewer leaves a comment like "I'd extract this into a helper," is that a team standard or a style choice? Without a shared reference point, there's no way to know. This leads to arguments over things that genuinely don't matter ([bikeshedding](https://en.wikipedia.org/wiki/Law_of_triviality)), and it makes developers defensive about feedback that might actually be valuable.

## The Fix: Build a Canon

The solution that worked for our team was building what we started calling a **canon**, a living document where the team records its decisions about how code should be written, structured, and reviewed. Not a style guide imposed from above, but a set of agreements the team makes together and can reference during review.

The word matters. A style guide feels like a rulebook. A canon feels like a body of knowledge the team builds over time. It grows and changes as the team learns. It's not about being rigid, it's about being explicit.

A canon covers things like:

> **Error Handling**
> - Use early returns for guard clauses
> - Let exceptions propagate unless you can handle them meaningfully
> - Log at the boundary, not at every level
>
> **Naming**
> - Boolean variables start with is/has/should
> - Avoid abbreviations except for well-known acronyms (URL, ID, HTTP)
>
> **Testing**
> - One assertion per test unless testing a workflow
> - Name tests: "should [expected behavior] when [condition]"

These aren't controversial opinions. They're decisions. The team discussed them, agreed on them, and wrote them down. The specific choices matter less than the fact that they exist and everyone knows where to find them.

Once you have a canon, review comments fall into two clear categories: **"this violates canon"** and **"this is my suggestion."** That distinction changes everything. A developer getting a canon comment knows exactly what to fix and why. A developer getting a preference comment can weigh it, discuss it, or push back without it feeling personal. If a preference keeps coming up, the team can discuss it and either add it to the canon or explicitly decide not to.

## Make Review Somebody's Job

A canon solves the "what to review" problem, but you still need to solve the "when to review" problem. Community review doesn't work because it relies on goodwill and free time, two things developers rarely have in abundance.

The deeper issue is that **the incentives are misaligned**. Companies, teams, and leadership measure individual productivity. How many stories did you close, how many features did you ship, how much code did you write. Code review doesn't show up in any of those metrics. It's invisible work that makes everyone else faster, but it's rarely recognized or rewarded. When the incentive structure values your own output over unblocking your teammates, code review will always lose. Telling the team "please review PRs promptly" doesn't fix a structural problem.

What worked for our team was making it someone's job explicitly. Either assign named developers to review specific PRs, or create a rotating review group whose job is to unblock others. The key is that **someone is accountable for reviewing code when it's ready**, not when they get around to it.

This sounds heavy, but it's lighter than the alternative. A PR that gets reviewed in two hours costs the team far less than one that sits for two days while the developer context-switches to something else and then has to context-switch back.

## Get Buy-In From the Business

This is the part that teams skip, and it's the part that kills the effort.

Adopting a canon means developers will move slower at first. Code that used to slide through review will get comments. Patterns that were "fine" will need to be refactored to match the team's agreed-upon approach. This is friction, and friction conflicts with pressure to deliver.

The team needs buy-in from the business before starting. The default expectation should be that code meets canonical standards before shipping to production, but with the understanding that concessions happen. An MVP can always be followed up with a more thorough implementation. That's not cutting corners, that's agile development working as intended. The important part is knowing when you're taking on technical debt and having a plan to pay it back.

Without this conversation, the canon becomes a source of guilt instead of a source of clarity. Developers feel bad shipping code that doesn't meet the standard, but they also feel pressure to ship fast. That tension will kill the whole initiative.

## Updating the Canon for AI-Assisted Development

These ideas held up well for a few years. Then AI changed the equation.

If your team is using AI-assisted development, as most are by now, your canon should lean heavily toward established, popular conventions rather than bespoke rules. For JavaScript, that means defaulting to something like ESLint's recommended rules rather than crafting your own set from scratch. There are a few reasons this matters.

**Established conventions have earned their position.** If a majority of teams and developers have converged on a set of patterns, that's a strong signal. The collective wisdom of thousands of teams is a reasonable starting point, and the burden of proof should be on deviating from it, not on following it.

**Popular conventions are enforceable with existing tooling.** ESLint, Prettier, Ruff, Clippy. These tools already encode the conventions that most teams follow. When your canon aligns with what the tooling supports out of the box, you're turning on existing rules, not writing custom ones from scratch.

**AI models are trained on these patterns.** If your canon prescribes unconventional patterns, you're going to spend time fighting the AI's instincts on every suggestion. The models have seen millions of files that follow standard conventions, and that's what they'll reach for. Rolling your own style guide that's maybe marginally better isn't worth the friction.

The bottom line is that there's not a big incentive to be clever with your conventions. Go with the flow. The things that matter, like consistent error handling and naming and test structure, are still worth codifying. But codify the popular version, not the artisanal one.

## Automate the Boring Parts

Building your canon on popular conventions also unlocks something that wasn't practical in 2022: you can automate most of the enforcement. Configure your AI coding assistant with your canon so the code it generates already follows your conventions. Run linters and formatters in CI that block merges when standards aren't met. Set up LLM-powered review bots that evaluate PRs against your canon for the things that aren't easily expressed as lint rules. When your canon is built on established conventions, the tooling to enforce it mostly already exists.

This also changes what human code review is for. I spend less time now on canonical style enforcement during review than I did a few years ago. Not because it matters less, but because machines are handling it before I ever open the PR. Human review shifts to the things automation can't catch: whether the approach makes sense for the business problem, whether there are edge cases the tests don't cover, whether the abstraction will hold up as the feature grows.

There's a lot more to say about how to layer these guardrails effectively, especially when the person writing the code isn't a developer at all. That's a separate post.

## Conventions Change, and That's the Hard Part

A canon isn't a document you write once and forget. Best practices evolve, new tools emerge, and what the team agreed on three years ago might not be what you'd choose today. That's fine. The canon should make it obvious what the preferred convention is *right now*, with the understanding that it will shift.

The most important thing is that the entire team is following the same practice at the same time, steering the boat in the same direction. The course may change as better practices emerge, and ideally the team will make changes together when that happens. But at least everyone is still going in the same direction.

The real challenge shows up when you're working in a part of the codebase that was built under an older version of the canon. Let's say the team moved from one pattern to another last year, and now you're extending a feature that still uses the old approach. Do you refactor it?

This is genuinely tricky, and I don't think there's a clean answer.

**If the refactor is small and low-risk**, and you can modernize the code without getting sidetracked from the actual business problem you're solving, it's probably worth doing. You're already in the code, you understand the context, and the cost is minimal.

**If the refactor is large and would derail your current work**, you have to weigh it differently. You're no longer solving the problem you set out to solve. But if you don't refactor, you may end up extending the old pattern further because the new convention doesn't fit cleanly on top of the old code. Either way, you end up with a codebase that's not completely uniform.

This is just the reality of maintaining software over time. You're going to have code that reflects different eras of the canon. The key is that the team was aligned at each point in time. That's a manageable kind of inconsistency. What's unmanageable is when every developer on the team had a different style at the same time, and then each of those different styles evolved independently. That's orders of magnitude more complex.

One thing that might help is maintaining a **changelog of the canon itself**. If you can look at the canon's history alongside Git history, you can understand *why* code in a particular area looks the way it does. It was written when the team's convention was X, and the convention has since moved to Y. That context makes it easier to decide whether a refactor is worth it or whether extending the old pattern is the more pragmatic choice.

## When to Re-evaluate

I'm also not saying your team needs to chase every new convention. Being uniform matters more than being current. Maybe you re-evaluate once a year, or maybe you don't re-evaluate at all when things are working for you.

At ExecOnline, we used MobX on the front end for a long time, and it worked. It wasn't until hooks matured enough to be a real alternative, and we started hitting actual performance problems with pages slowing down and state management getting confusing, that we had a reason to change. Tools like TanStack Query gave us a path forward that addressed real pain we were feeling. We didn't switch because MobX was unfashionable. We switched because the problems we were experiencing had better solutions available.

That's the right trigger for re-evaluating your canon: not "there's a newer way" but "the current way is creating problems and there are better options." Until that threshold is crossed, consistency beats novelty every time.

## What Changes

When a team has a working canon and a clear review process, the improvements compound.

**For developers**, the review process becomes predictable. You can check your own code against the canon before opening the PR. When you get a comment, you can see whether it's a standard or a suggestion. You learn faster because the feedback is grounded in shared agreements, not individual taste.

**For reviewers**, the job gets easier and more focused. Most style and convention issues are caught by automation before you ever open the PR. You spend your time on design, correctness, and business logic instead of formatting and naming.

**For the business**, the code that reaches production is more resilient, more consistent, and easier to extend. New developers ramp up faster because the codebase looks the same everywhere and the canon answers most of their "how should I do this" questions. The team isn't constantly relitigating decisions that were already made.

None of this is revolutionary. It's just the difference between a team that has made decisions and a team that hasn't. The canon is the proof that you've done the work.
