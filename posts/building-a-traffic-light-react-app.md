---
title: "Building a Traffic Light React App"
subtitle: "With State Machines and Domain Driven Design"
date: 2022-09-26
readTime: 3
cover: "/assets/covers/building-a-traffic-light-react-app.jpeg"
tags: ["React", "TypeScript", "domain", "Functional Programming", "solution modeling"]
hashnodeUrl: "https://blog.jcosta.tech/building-a-traffic-light-react-app"
---

![GIF](https://j.gifs.com/gpNkr6.gif)

I set out to build an example that demonstrates how to manage state in a React TypeScript application using state machines. Traffic lights are commonly used as examples to describe how state machines work, so that seemed like a good place to start. The repo is available [here](https://github.com/costajohnt/stoplight-state-machine).

## Getting Started
The first step was to take a look at prior work, and a quick google search returned [this article](https://medium.com/well-red/state-machines-for-everyone-part-1-introduction-b7ac9aaf482e), which explains state machines pretty well and has good examples. I set out to recreate the author's design with React, TypeScript, and Functional Programming techniques. The states and transitions look like this (image from author article):

![image.png](/assets/post-images/building-a-traffic-light-react-app/0.png)

## Something's Not Right
The code was working as implemented, but parts of the design were concerning:

- The types may not represent a finite state machine for a traffic light. If the power is out, the light will be completely off. This is a valid, real world case that should be handled as a valid state. 
- Defining the power outage state with the current naming conventions is troublesome. `Off` does not fit with the color convention, and `black` doesn't seem appropriate in this context.
- A newly installed light would be in a powered down or off state before being switched on for the first time. This state would be visually similar to the power outage state, but different in ability to transition to some other state. A light that is off because of a power outage would require fixing before being able to be powered back on, but a newly installed light would be able to go directly into a powered on state.

At this point, I wasn't quite sure how to refactor. Maybe building the app out a bit more would bring the problems to light. I decided to extend the state machine by adding a left turn indicator.

## Coming Into Focus
Adding the left turn arrow meant adding a lot more states to the state machine. I started adding states like `red-light-green-arrow` and `flashing-red-arrow-off.` Yikes! Each new state exemplified the design issues. These names were getting long, and could continue to grow even longer as the complexity of the app develops. The fundamental flaw is that the **states were defined by their visual representation** in the user interface. This convention is not scalable and does not convey the business intent properly.  

## Solution
First, it helps to think about what a traffic light really represents. Most of us learn how to read a stop light at a young age and take it for granted, but suppose you had to explain it to a small child.

You might say,\ "Green means go." This implies movement and priority to proceed through an intersection. Yellow is a warning that movement will be prohibited soon. Red means stop, stay immobile, movement is not allowed. These words describe the domain logic of a traffic light. [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design) can be a powerful tool for building systems using a language that both the domain expert and developer can share.

## Extension
Now we have a `Warning` state and a `Prohibited` state for yellow and red lights. When the left turn signal is green, we represent this as `PriorityLeft` instead of `red-light-green-arrow`. `Green-light-flashing-yellow-arrow` is `PriorityStraight`. Here is what our type for `PriorityStraight` looks like:

![Screen Shot 2022-09-25 at 5.49.52 PM.jpeg](/assets/post-images/building-a-traffic-light-react-app/1.jpeg)

And here is how our finite state machine is represented in the types:

![PNG image.jpeg](/assets/post-images/building-a-traffic-light-react-app/2.jpeg)

## Conclusion

Modeling the domain in terms of the business function helps control complexity and aids maintainability/extendability as an application scales.

