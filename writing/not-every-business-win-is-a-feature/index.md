---
title: "Not Every Business Win Is a Feature"
subtitle: "Where engineering value lives at a mature B2B company"
date: 2026-04-27
readTime: 5
cover: "/assets/covers/not-every-business-win-is-a-feature.png"
tags: ["engineering", "career", "ai", "b2b", "engineering-management"]
seoTitle: "Not Every Business Win Is a Feature"
seoDescription: "At a mature B2B company the biggest wins live outside the product. Four real engineering projects in the systems around sales, CS, and operations."
hashnodeUrl: "https://blog.jcosta.tech/not-every-business-win-is-a-feature"
---

There's an assumption engineers pick up early. The way you create value is by shipping something into the product: a feature, a fix, an improvement to something users see every day. That's the roadmap, that's the sprint board, and that's where engineering time goes.

At a mature B2B company, this starts to run out of road. The product works. It has the capabilities it needs. The next increment of business upside probably isn't hiding behind another feature, because the product already does most of what customers want it to do. You can keep grinding on the roadmap looking for the next win, or you can step back and ask where value is actually being left on the table.

Usually it's not in the product. It's in everything around it.

## The Business Lives Outside the Product

A B2B company around a mature product is mostly people doing work that isn't writing code. Sales teams spend their days researching prospects, running calls, and working deals through long cycles. Client success teams onboard new customers and manage existing ones. Operations handles provisioning, billing, reporting. Support handles inbound. The product sits in the middle of all of it, but it isn't the whole business, and often it isn't even most of the work.

All of that work is business-value work. A sales team that closes more deals generates revenue. A CS team that onboards faster reduces time-to-value and churn. An operations team that runs smoothly removes friction across the company. An engineer who improves any of those systems is shipping business value, just not from the product roadmap.

I made a version of this argument in ["What It Takes to Be a Software Engineer in 2026"](https://blog.jcosta.tech/what-it-takes-to-be-a-software-engineer-in-2026) earlier this year. One of the tactics I listed was working cross-functionally, applying engineering effort in places most teams used to ignore. This is the deep-dive version. Four actual projects, what they look like, and what each one is for.

## What I've Been Working On

I worked at a mature B2B company that sells professional development content to organizations. Over my last year there, most of my engineering time went to systems that didn't ship inside the product, but still moved the business.

**The sales-to-client-success handoff.** This is the project I wrote about in [the coordination tax](https://blog.jcosta.tech/the-coordination-tax). Sales closes a deal, hands it off to client success, and client success ends up asking the new client many of the same questions sales already asked. Then they have to navigate a catalog of over 200 programs to figure out which ones fit. I built a pipeline that runs on every Gong sales call. It pulls the call summary from Salesforce, scores the prospect's stated needs against our program catalog with Claude on Bedrock, and writes a ranked set of recommendations back to Salesforce. Recommendations build up over the sales cycle as more calls happen. On deal close, a webhook pushes the latest set into the platform and creates a tailored "Recommended for You" collection automatically. The client logs in and there's a curriculum waiting, ready to use or to edit. The experience goes from "wait a few weeks while someone builds out a curriculum with you" to "your tailored setup is ready when you log in." Shorter onboarding, less manual CS work, faster time-to-value. All of it happens outside the product.

**Warm lead enrichment for sales.** Our sales team has much better close rates when they're selling into existing relationships. A contact they worked with two years ago, who has since moved to a new company and a buying role, is a warmer lead than any cold outbound prospect. The problem is finding those contacts at scale and figuring out who's actually in a buying position now. Sales reps were doing this by hand, five to ten accounts a week, which meant the backlog was never going to clear. I built a system that pulls a filtered list of lapsed contacts from Salesforce, searches ZoomInfo to find where each person is now, scores them with Claude on role fit, ICP fit, and warmth, and writes a prioritized list of leads back into Salesforce for sales to action. The value is straightforward. More deals closed, a shorter sales cycle, and fewer hours spent on cold outbound that goes nowhere.

**Evangelizing agentic AI across the company.** A lot of my time over the past year has gone into getting the whole organization comfortable with AI tools: internal presentations, a Slack channel I created and grew into the go-to place for AI learning across the team, and one-on-one help getting colleagues set up. Most people are now using AI day to day, which is the easy half. The harder half is the agentic side, where AI connects to the systems people actually work in. There aren't MCP servers for many of the tools we use, so I've been building the connections and writing setup guides others can paste into their own Claude Code session to replicate. I wired up the Salesforce CLI to Claude Code so I can pull SF data programmatically. The guide that came out of it lets a colleague replicate the setup themselves. For people who need reporting data out of Redshift, I set up programmatic access through Tailscale. For people who work with sales call recordings, I set up a Gong MCP server. The Gong piece is the interesting one. It serves multiple teams across the company, and it ends up replacing the sales-call knowledge base I was originally going to build for client success. Sometimes the right answer is wiring up an existing tool, not building a new one.

**Preview access during the sales cycle.** The next one on the list when I left. The platform already supports auditor access for signed clients, and the plan was to open it up earlier so prospects can get in during the sales cycle, not just after they close. We'd seed their view with the programs we've already recommended from their sales calls, let them browse the full catalog, build their own collections, and audit actual course content while they're still evaluating. Sales cycles usually don't involve using the product. This one would. That's a close-rate lever, because prospects who've been building for two weeks are more committed than prospects who've only been sitting through demos. It's also faster time-to-value after they sign, because they're already set up the day the deal closes.

## The Pattern

None of these projects touch the product. They sit in the space around it: before the customer signs, between sales and CS, inside the research sales does every day, in how the rest of the company is using AI in their own work. And they all move the business forward in ways the roadmap wouldn't.

Most of them also make the customer experience better. That's a good byproduct, and in most cases it's real. But it's not the thesis. The main thing these projects have in common is that they're business-value work an engineer is well-suited to do, and that nobody else was going to do.

At a mature company, this is where a lot of the biggest value lives. The product is solid. The roadmap is mostly incremental. But the human systems around the product are still inefficient, still manual, still full of places where engineering can move the needle. That's the work.

## What to Look For

The kinds of problems worth looking at aren't usually feature problems. They're operations problems, sales-efficiency problems, handoff problems. Each is still an engineering problem, just one most engineering teams aren't set up to see.

The engineers who stand out at mature companies aren't always the ones who ship the most features. They're often the ones who look at the whole business and find the engineering work nobody else is doing, because nobody else recognized it was engineering work.
