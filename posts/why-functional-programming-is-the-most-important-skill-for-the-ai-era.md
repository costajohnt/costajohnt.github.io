---
title: "Why Functional Programming Is the Most Important Skill for the AI Era"
subtitle: "What type-driven design, declarative thinking, and domain modeling have to do with AI"
date: 2026-02-24
readTime: 8
cover: "/assets/covers/why-functional-programming-is-the-most-important-skill-for-the-ai-era.png"
tags: ["Functional Programming", "AI", "Software Engineering", "claude-code", "#Domain-Driven-Design"]
seoDescription: "The skills that matter in AI-directed development aren't about code. They're about types, declarative thinking, and domain modeling."
hashnodeUrl: "https://blog.jcosta.tech/why-functional-programming-is-the-most-important-skill-for-the-ai-era"
---

Boris Cherny, the creator of Claude Code at Anthropic, recently appeared on [Lenny's Podcast](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) and said something that stopped me in my tracks. When asked whether coding skills still matter, he was unequivocal: coding is "solved." Claude Code writes 100% of his code now. He doesn't miss the manual work, and he doesn't care if those skills atrophy.

I don't either. And I think Boris and I arrived at that conclusion through remarkably similar paths.

Boris studied economics, not computer science. He dropped out to start startups at 18. He got into coding because he wanted to build things, not because he loved the act of writing code itself. I came from philosophy. My first lines of code were JavaScript macros in Photoshop, automating the tedious parts of product photography. Neither of us set out to become software engineers. We set out to solve problems, and code was the tool we reached for.

Along the way, we both fell in love with functional programming. Boris discovered it after a motorcycle accident broke both his arms. He needed languages with fewer keystrokes, which led him from CoffeeScript to Haskell to Scala to TypeScript. He calls *Functional Programming in Scala* the most important technical book of his career. For me, the book that changed everything was *Domain Modeling Made Functional* by Scott Wlaschin. I came from an object-oriented background and genuinely didn't know another paradigm existed. When functional programming finally clicked, it fundamentally rewired how I think about building software.

Here's why that matters right now: the specific mental models that functional programming teaches you are exactly the skills you need to build effectively with AI. Not because AI writes functional code. It mostly doesn't. But because directing AI is itself a functional act. There are three reasons why.

## 1\. Strong Types Communicate Intent

Boris says something in his Peterman Pod interview that I think is quietly profound: "I think in types when I code. The type signatures are more important than the code itself."

This is the first pillar. When you design a system by writing your types first, you're building a contract. You're defining what's possible, what's impossible, and what the boundaries of behavior look like. A well-designed type system is a set of constraints that eliminates entire categories of invalid states before a single line of implementation is written.

AI responds incredibly well to this. When you hand an AI a codebase with strong, expressive types, including well-defined state machines expressed through those types, you're giving it clear guardrails. The types communicate your intent in a way that's unambiguous. The AI doesn't have to guess what you want because the type system already constrains the universe of valid outcomes.

Think about it from the AI's perspective. If it's generating code in a loosely typed or untyped environment, it has enormous degrees of freedom. That means enormous potential to produce something that technically works but doesn't match your intent. Strong types collapse that space. They're a forcing function toward correctness.

This is why "thinking in types" isn't just a nice engineering practice anymore. It's becoming a prerequisite for effective AI-directed development. When you set up your type system and your state machines first, you're not just designing your software. You're designing the constraints that will guide the AI toward the right implementation.

## 2\. Declarative Thinking Describes Outcomes, Not Instructions

The second reason functional programming prepares you for the AI era is more fundamental: functional programming is primarily declarative.

Consider SQL. When you write a SQL query, you don't tell the database engine how to search through the data. You don't specify which index to use, in what order to traverse the rows, or how to join the tables internally. You describe the outcome you want. Give me all records where this condition is true, grouped by this field, sorted by that one. The database engine figures out how to get there.

The underlying system is free to change and improve. The database might be rewritten tomorrow. None of that breaks your query, because your query never specified the *how*. It only specified the *what*.

Functional programming works the same way. When you compose pure functions, when you map and filter and reduce, you're describing transformations, not step-by-step procedures. You're saying "take this data and produce this shape" rather than "first do this, then check that, then loop through these."

Now apply this to how we work with AI. When you prompt an AI tool to build something, you are, at its core, performing a declarative act. You're describing the outcome you want. You're telling the AI *what* you need, and letting it figure out *how* to get there.

If you come from an imperative, object-oriented background, your instinct is to think in step-by-step instructions. You want to tell the computer exactly what to do and in what order. That instinct works against you when directing AI, because the AI might know a better way to reach the outcome. And as models improve, the *how* gets better. But only if you've left room for it. When you over-specify the implementation, you're constraining the AI in ways that will become increasingly counterproductive as the tools evolve.

Boris makes this point explicitly: build for the model six months from now, not the model you have today. Declarative specs are how you do that. The *what* you need doesn't change. The AI's ability to figure out the *how* only gets better.

Functional programmers have been training this muscle for years. We already think in terms of inputs, transformations, and outputs. We already describe outcomes rather than procedures. That's exactly the skill that AI-directed development demands.

## 3\. Domain Modeling Is the Real Skill

The third piece is the one I think is most underappreciated, and it's the one that ties the whole argument together.

*Domain Modeling Made Functional* taught me that code should model the domain so faithfully that a domain expert, the person the software is actually built for, should be able to read the code and understand what it means. The code and the business logic shouldn't speak different languages. Your types should map to real-world concepts. Your functions should describe real-world operations. If the domain expert says "a customer places an order" and your code says `processTransaction(entityRef, ctx)`, something has gone wrong.

This principle has always been good engineering practice. But now it's becoming essential for a different reason: English is becoming the primary programming language.

When you're working with AI, you're describing what you want to build in natural language. You're explaining the problem, the constraints, the user's needs, the desired behavior. You're doing domain modeling. In English. If you've spent years training yourself to think about software from the domain expert's perspective, to understand the problem space deeply and express it clearly, you're already fluent in the most important language of AI-directed development.

The engineers who struggle with AI tools are often the ones who think about code in terms of code. In terms of patterns, abstractions, and implementation details. The engineers who thrive are the ones who think about code in terms of the problem it solves. They can articulate what the software should do because they deeply understand *why* it exists and *who* it's for.

Boris talks about this instinct on the Lenny's Podcast episode. He describes "latent demand" as the most important principle in product. You can't get people to do something they don't already want to do. You find the intent they already have and build around it. That's product thinking, but it's also domain modeling. It's understanding the problem before you write a single line of code.

## The Punchline

Types define the boundaries, declarative thinking describes the outcomes, and domain modeling ensures you're solving the right problem. None of these are about writing code. They're about thinking clearly, and then letting the AI do the writing.

Boris and I both came to engineering from liberal arts backgrounds. We both fell in love with functional programming. We both arrived at the same conclusion: the act of coding is being commoditized. But the skills that functional programming taught us are becoming more valuable, not less.

If you're an engineer wondering which skills to invest in right now, my advice is counterintuitive: don't practice writing code faster. Practice thinking about problems more clearly. The engineers who will thrive in the AI era aren't the ones who can write the most code. They're the ones who can think the most clearly about what needs to be built, and then let the machines do the building.

Shout out to Ryan Bell for introducing me to functional programming. It changed everything.

* * *

## Resources

*   [Lenny's Podcast: "Head of Claude Code: What happens after coding is solved | Boris Cherny"](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) (Feb 19, 2026)
    
*   [The Peterman Pod: "Boris Cherny (Creator of Claude Code) On How His Career Grew"](https://www.developing.dev/p/boris-cherny-creator-of-claude-code) (Dec 15, 2025)
    
*   *Functional Programming in Scala* by Paul Chiusano and Runar Bjarnason
    
*   *Programming TypeScript* by Boris Cherny
    
*   *Domain Modeling Made Functional* by Scott Wlaschin
