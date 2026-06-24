---
title: "Your AI Setup Is a Depreciating Asset"
subtitle: "The durable skill isn't building a better workflow. It's being willing to throw yours away."
date: 2026-06-24
readTime: 7
cover: "/assets/covers/ai-setup-depreciating-asset.png"
tags: ["ai", "claude-code", "ai-engineering", "workflow", "software-engineering"]
seoTitle: "Your AI Setup Is a Depreciating Asset"
seoDescription: "Every model release quietly retires part of your AI workflow. The durable skill isn't a better setup, it's being willing to delete the one you have. Here's how I decide what to keep."
hashnodeUrl: "https://blog.jcosta.tech/ai-setup-depreciating-asset"
---

A new model shipped last month, so I did the thing I now do on every release: I asked Claude to audit my own setup. Which of my skills and plugins am I actually using, and which am I not? It came back with a list of dead weight, things I had built or installed months earlier that the base model had quietly grown good enough to handle on its own. I spent the afternoon switching them off. A couple I deleted outright.

Some of it I had been quietly proud of building. It stung a little to turn it off. It also wasn't the first time.

I've come to think of my AI setup the way an accountant thinks of equipment. It's an asset, it produces value, and it depreciates. Every model release writes down part of its value. Some of it goes to zero. The mistake isn't building the setup. The mistake is treating it like it's permanent, and holding onto it long after the model started doing the same thing for free.

The skill that actually compounds isn't building a better workflow. It's being willing to throw yours away.

## I keep believing in "the skill," then deleting it

If I look back at how I've worked with these models, it's a graveyard of things I was once sure mattered.

**It started with the prompt.** Early on, the model knew almost nothing about my project, and the context window was tiny. So the whole game was the incantation. You crafted the exact phrasing, front-loaded every constraint, and treated the prompt like a spell that would break if you got a word wrong. I spent real time wordsmithing prompts. That was the skill, or so I thought.

**Then context got cheap, and the prompt stopped mattering.** Windows grew, the tools got better at pulling in the right files, and suddenly the move wasn't to be precise, it was to be generous. Stop crafting, start dumping. I'd open in a planning mode and just talk, the way I'm talking now, getting everything out of my head and onto the page, then work with the model to refine it into something sharp. Precise prompting quietly became irrelevant. The leverage was in the context, not the wording.

**Then the window filled up, and managing it became a craft of its own.** Context wasn't free after all. Quality sags as the window fills, so I built rituals around it. I watched how much room I had left. Before clearing a session I'd have the model write a continuation prompt that pointed back to the important state. I kept long-term memory in markdown files the model updated as it went. I [gave Claude Code a persistent brain in Obsidian](/writing/how-i-give-claude-code-a-persistent-brain-in-obsidian/), a markdown vault it kept a running record in so nothing got lost when I cleared.

I was good at that ritual. And then a million-token context window showed up, and memory features got baked into the tools, and I noticed I just... stopped. The continuation prompts, the constant clearing, the careful hoarding of context. Most of it was dead weight inside of a few weeks. The persistent-memory idea survived. The elaborate machinery I'd built around a small window did not.

**Now it's loops.** The models are agentic enough that the unit of work isn't a prompt anymore, it's a goal. Boris Cherny, who built Claude Code, describes his own job shifting from prompting Claude to writing loops: agents running continuously in the background, opening pull requests with no end-of-task state. He keeps a couple running permanently, one scanning for architectural improvements, another hunting for duplicated abstractions to unify. Other people run scrappier versions of the same instinct, a shell script that re-feeds a goal and lets the model grind against it with fresh context each pass. Set a goal, build something that can tell whether the goal is met, and let it iterate. Some of these you run on a schedule and walk away from.

Four eras, four times I was sure I'd found the skill that mattered. Four times the next release moved the skill somewhere else, and the thing I'd built started rotting the moment I finished it.

That's not a story about being wrong. Each belief was correct for its moment. It's a story about how short the moment is. Strong beliefs, held loosely, with a short shelf life.

## Customization pays, and then it expires

Here's where I have to be careful, because the lazy version of this is "don't customize, just use the vanilla model," and that's wrong.

Customization clearly pays. Cherny isn't running plain Claude, he built custom loops. There's good reason to add a frontend-design skill when the base model's taste is generic, or to bolt on something like Serena when you're searching a codebase too big for the model to hold in its head. Constraints, linters, and feedback loops genuinely make agents more reliable. Setup is not the enemy.

The trap is forgetting that every piece of it is depreciating. The clever scaffolding you built six months ago was filling a gap the model had then. The question is never "is this useful," because it was useful when you built it. The question is "is this still buying me anything the model doesn't now do on its own."

So I've turned that into a routine instead of an accident. Every time a meaningfully better model ships, I run the plain model against my custom setup on real work and see how big the gap actually is. Then I go looking to cut, and I run the same audit I opened this post with. The model is surprisingly good at appraising itself: point it at your own config and it'll flag the dead weight, the half-configured experiment you forgot about, the skill the base model now does better unaided. I disable those first rather than deleting them, so it's reversible if I got it wrong, and delete them later once I'm sure I don't miss them. Removal is the default, and each piece of tooling has to re-earn its place.

Most of the time I cut something. Occasionally the custom setup still wins clearly, and then I keep it, gladly, until the next release puts it back on trial.

## Don't over-build something you're going to throw away

The deleting isn't really the point. The point is what it should teach you about the building.

It is genuinely fun to build your setup. Tuning the config, wiring up the perfect agent, polishing the rig until it hums. It feels like progress. But past a point it's the most disguised form of procrastination I know, because the returns are shrinking under you the whole time. The model is getting better at the exact thing you're hand-building, faster than you can hand-build it.

You're not building a cathedral here. You're building scaffolding. It holds something up while you work, and then it comes down. A setup is worth roughly the effort it saves you between now and the next release that makes it redundant, and that release is closer than it feels. Over-engineer it and you've poured hours into something with a shelf life of weeks.

So build enough to get real leverage, then stop and go make the thing you actually wanted to make. The point of the tooling was never the tooling. A workflow you'd cheerfully throw away next month means you're holding it at the right altitude. One you'd defend to the death is usually one that's already started to cost you.

The models are improving so fast that the highest-leverage move most weeks isn't a better setup. It's refusing to over-invest in the one you have.
