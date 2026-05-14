---
title: "If Your Decisions Live in DMs, You Don't Have an AI Strategy"
subtitle: "The communication substrate every AI tool will run on"
date: 2026-05-14
readTime: 6
cover: "/assets/covers/if-your-decisions-live-in-dms.png"
tags: ["ai", "engineering-management", "team-practices", "communication", "automation"]
seoTitle: "If Your Decisions Live in DMs, You Don't Have an AI Strategy"
seoDescription: "Most companies' AI strategies will fail because the inputs aren't there. Adding usage standards on top of your tools does two jobs: enforce hygiene today, and create the substrate AI tooling can read tomorrow."
---

Most teams pick their tools and stop there. Use Slack instead of email. Use Confluence for docs, not personal drives. How to actually use the tools is left to whoever's typing.

Adding usage standards does two jobs at once. They enforce hygiene: cross-functional work gets easier to find, new hires can onboard themselves, you stop re-litigating decisions because somebody missed the original conversation. And they turn the team's daily practices into a substrate that AI tooling can build on.

Most teams that do this kind of work stop at the first job. The second job is where the leverage is. Layering AI on top of how a team works is mostly off-the-shelf plumbing now. LLMs summarize meetings. MCP servers read Slack. Vector stores and retrieval exist. The hard part isn't building AI features. It's making sure your team produces inputs the AI can read.

In most companies, mine included, the decisions that matter most live in places that no automation, no LLM, no MCP server, and no future AI agent can ever reach. They live in DMs. In huddles. In private channels. In meetings nobody recorded.

A model can only act on what it can see. If your org's most important decisions happen in places that an LLM can't read, **you don't have an AI strategy. You have a wishlist.**

I've been working on this at my company in two places: Slack and meetings.

## Example one: the Slack canon

The Slack Canon is named after the code canon we already maintain in engineering. "Canon" is the right word: it's how we do things here, and it's written down. It compresses to five lines:

1. Default to channels, not group DMs. Make a channel instead. Others can lurk and learn.
2. Default to public, not private. Reserve private for HR, security incidents, exec topics, sensitive vendor conversations.
3. If you end up in a huddle or a DM and a decision comes out of it, write it back to a relevant channel. Two or three lines is enough.
4. Reply in threads, not DMs, when you're following up on a channel post. Your question is almost certainly one others have too.
5. Search before making a new channel. Two channels covering the same ground is worse than one busy channel.

We don't enforce them. People self-correct, and anyone can nudge anyone.

Yes, some things shouldn't be in public channels. Rule 2 covers them. The point is to make those carve-outs the exception, not the default. Most communication isn't sensitive. The "just in case" default is the actual problem.

## Example two: meeting recordings

The Slack canon handles asynchronous text. The other half of company communication is meetings, and meetings are way worse. A Zoom call ends and the content disappears unless somebody remembered to take notes, write a summary, and post it somewhere. Most of the time nobody does. Decisions get made, two or three people remember some version of them, and a month later you find out a different team made a contradictory decision because nobody could see the original one.

The fix is the same shape as the Slack rules: make the artifact exist, and put it somewhere observable. The artifact is the recording. Once a meeting is recorded, everything downstream can be done by a model. Transcript. Summary. Pulling out the decisions. Posting them to the wiki and a Slack channel. Verifying with attendees. None of it needs a human. The hard part collapses to one question: did you record the meeting?

Once the recording exists, the rest of the pipeline lights up. You've turned the lossiest form of company communication into something you can search. You can ask "what did we decide about X?" and get a real answer. And then it compounds. A summary alone is mildly useful. A summary plus extracted decisions plus a search index plus a wiki page becomes something you can build a lot on.

## What this enables

Once the substrate exists, the AI possibilities become a backlog you can scope, not a roadmap you wave at. Some examples:

**Cross-team alignment scanning.** Today, conflicts get caught when somebody happens to be in both meetings, which is luck. Tomorrow, a weekly LLM scan of public channels and recent meeting summaries flags conflicts, duplicated effort, decisions that contradict published priorities, and decisions without owners. We're piloting a version of this on a single channel right now.

**Discovery and retrieval.** Today, "where did we land on X?" means asking three people and hoping somebody remembers. Tomorrow, an assistant reads the public channel corpus, the wiki, and recent meeting summaries together. Not a chatbot. A search layer that works because the things you're searching for are written down.

**Onboarding agents.** Today, a new hire sets up five 1:1s and hopes the right people remember the right things. Tomorrow, they ask the corpus what's been decided in their domain, who owns what, what's active, and what's been tried before. You save the 1:1s for the things humans do better.

**Cross-functional dependency tracking.** Today, somebody has to remember to flag when team A's decisions affect team B's roadmap. Tomorrow, a scheduled job surfaces it automatically.

**Decision provenance.** Today, tracing why production behaves the way it does means archaeology across Slack, the wiki, and people's memories. Tomorrow, a model finds the thread, summary, or wiki page where it was decided, and the people who agreed to it.

**Proactive nudges.** Today, catching that a decision was made in a huddle and never written back depends on someone happening to notice. Tomorrow, a model watching the corpus flags it.

## Why this is hard

People default to the path of least friction. In most companies, that's "DM the person, talk in the huddle, decide in the meeting, never write it down." Each of those is a future blind spot for every AI tool you'll ever buy or build.

The friction isn't only convenience. People have a real human hesitation about posting publicly. The question feels dumb, the topic feels too niche, the worry is that you'll bother people who don't care. Group DMs and private channels feel safer because the audience is small and known.

That instinct is understandable, and it's also wrong on the math. Posting publicly is one-click reversible for anyone who finds it irrelevant: mute the thread, turn off notifications, leave the channel. Hiding context in a DM is a problem nobody else can solve, because they can't see it. Strong organizations have members who post anyway, and the rest of the org learns to trust that the signal is worth the occasional noise. Public posts do double duty: they answer the immediate question and disperse context to people you didn't even know needed it.

Meeting recordings hit the same nerve. Being on the record feels like being on trial. People worry about saying something dumb, taking a position they'd want to walk back, getting played back later. Default-to-record is a tough sell for that reason. Reminders at the start of every meeting are less of an ask, and they get the recording done most of the time.

How to actually pull this off when leadership isn't already on board is its own post.

The teams that pull ahead in AI won't be the ones with the best models. The models will be roughly equivalent. The differentiator is whether your information lives where a model can read it. Skip the work to make that happen, and the AI features you buy in 2027 will still be working on the same DMs and huddles they can't see today.
