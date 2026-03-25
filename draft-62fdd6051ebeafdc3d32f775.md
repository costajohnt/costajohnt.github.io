---
title: "Code Review Can Be Great"
slug: code-review-can-be-great

---

** Intro **
- you've felt the pain
**What is code review?**
  - Common setup - community review (look at PRs when you can). Dev requires approval before moving to next step
**Problem** 
  - most issues arise from lack of clearly defined and agreed upon structure around the review process
    - what should be required for approval?
    - who should be reviewing? who should be approving?
    - difficult to separate comments that are personal preference vs. code quality
      - wastes time
      - can lead to arguments over things that don't matter
    - leads to a lack of code uniformity, making codebase more difficult to grok
- Why is this bad?
  - It's not clear to the developer what they need to do to get their change through review, which makes things like estimates harder.
  - Reviewing code is not easy because there are no agreed upon code practices that the team follows. Any suggestions could be viewed as code style preference and not necessarily a definitive improvement. (talk annecdotal about how code review was hard for you)
  - Community review incentivizes developers to complete their own stories, not review other's code. 
  - All these issues increase timeline for reivew, gets cards stuck in this state, and ultimately hurts the business.

**Solution**

Create a canon
    - Make decisions as a team about how code should be structured, how the team should roll, etc. Record these decisions in a living document that can evolve and change as these decisions change, and can be referenced in the review process.
What is Canon?
  - Agree upon code structure and formatting
  - Leave the code better than you found it
  - *** Come back to this ***

Incentivize Code Review
  - Can be difficult with open, community review
  - Task developers directly with code review, or create a subgroup with the responsibility. It's important to review code when it's ready so developers are not blocked.
  - Anyone can participate in code review, subgroup required to

Set Clear Expectations With The Business
  - This new process may be hard at first. Developers will feel the pain trying to meet Canon. This conflicts with pressure from the business to deliver in a timely fashion. The development team will need buy in from the business to support this effort. The default expectation is that code will meet canonical standards before shipping to production, but concessions can be made when the business is in need. An MVP can always be followed up with a more robust solution. This is part of Agile development. The important part is knowing when you are adding to your tech debt and having a plan to address that.

** Effect **
Better for developers
  - Canon is available for reference. Devs can get more information to solve their issue when they get a comment. Devs can also see if the reviewer's comment is canon or their preference
  - addressing reviewer's comments objectively makes the PR better
  - dev's learn and become better

Better for reviewers
  - following canon introduces codebase uniformity. code that doesn't meet canon sticks out
  - it's easier to make a comment when the reviewer finds something that the team has already agreed not to do
  - Reviewing code objectively makes for a better developer

Better for the business
  - code that makes it to production is way more resilient, easy to extend. necessary for a growth stage company looking to scale



   

    