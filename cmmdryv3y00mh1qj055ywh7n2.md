---
title: "The Biggest Bottleneck in Enterprise Software Isn't Technical"
seoTitle: "The Coordination Tax: Why Enterprise Software Projects Move "
seoDescription: "Enterprise software projects often stall not because engineering is difficult, but because teams must coordinate across multiple systems and owners. T"
datePublished: 2026-03-05T18:04:18.047Z
cuid: cmmdryv3y00mh1qj055ywh7n2
slug: the-coordination-tax
cover: https://cdn.hashnode.com/uploads/covers/62fdd4ef1ebeafdc3d32f72e/a4d41c21-b62b-43d7-8e0d-c4edc82536d3.png
ogImage: https://cdn.hashnode.com/uploads/og-images/62fdd4ef1ebeafdc3d32f72e/29a363d2-8c61-4334-9c52-c67ae7101dad.png
tags: ai, software-development, developer, engineering-management, enterprise-ai

---

Enterprise projects don't move slowly because the engineering is hard. They move slowly because of coordination.

You know the pattern. You're building a feature that touches three systems. You own one of them. The other two are managed by developers with their own priorities, their own sprints, their own backlogs. So you schedule a meeting. You explain what you need. They agree it's important but can't get to it for two weeks. You context-switch to something else. Two weeks later, that piece is done but now you need infrastructure changes, and that developer is mid-sprint on something else. Another meeting. Another wait.

The engineering work might take two weeks. The coordination adds months.

I think of it as the coordination tax. Every cross-functional project pays it. And for most enterprise teams, it's the single biggest reason features take as long as they do. Not complexity. Not technical debt. Coordination.

I'm in the middle of a project right now that would normally be drowning in it.

## **The System**

I work at a B2B company that sells professional development content to organizations. We have hundreds of products in the catalog, and our clients serve them to their employees.

The sales cycle is long. Salespeople get on calls with prospects, ask about their needs, and figure out which products are the right fit. If we close the deal, it gets handed off to our client success team. Client success picks it up and naturally ends up covering a lot of the same ground, because the context from sales doesn't transfer cleanly. From there, either they manually set up the client's account, or they walk the client through our self-service tooling. Either way, there's a lot of repeated work and manual setup before the client is live.

I'm building a system to automate most of this.

We already use Gong to record sales calls, and those call summaries are stored in Salesforce. Every time a new call comes in, a Salesforce Flow identifies all the calls linked to that opportunity and sends them to an AWS Lambda function through an API Gateway. The Lambda function is a Python service that calls out to an LLM. It has access to our complete product catalog and metadata. The model analyzes the call summaries against the catalog, understands what the prospect actually needs, and generates a set of product recommendations. Those recommendations get written back to a custom object in Salesforce.

Every new call refines the recommendations. The system gets smarter about what the client needs as the sales process progresses. When the opportunity is marked closed-won, the recommendations are finalized.

From there, Salesforce syncs with our Rails monolith. The platform automatically creates a new organization for the client, builds a product package from the finalized recommendations, and grants access. Client success no longer needs to start from scratch. Instead of rebuilding context from the sales cycle and manually assembling everything, there's a tailored setup already waiting. The client will still customize things over time, but they're up and running on day one.

That's the system.

## **The Wall**

I'm a full-stack developer. I work primarily in Rails and React with TypeScript. Python isn't even my main language, but I've been deploying production Python to Lambda functions for the past year with the help of AI coding tools. I can build the sync logic. I can handle the front-end work.

But this project also requires creating custom objects and triggers in Salesforce. I've never worked in Salesforce before. And it requires Terraform to stand up the infrastructure: a Docker container for the Lambda function, the API Gateway, all the AWS plumbing. I've worked with Docker, I've deployed Lambda functions, I've used API Gateway. But I've never written the Terraform to provision it all.

Normally, this means coordination. I'd ask our Salesforce developer to create the custom objects I need. He'd say yes, but he's in the middle of his own work. We'd need to loop in leadership to prioritize it. Same story with our platform engineer for the Terraform work. Meetings. Slack threads. Prioritization discussions. Context-switching on both sides.

I know what I need built. I understand the requirements completely. But I can't move forward because the work lives in someone else's domain.

This is the coordination tax.

## **What Changed**

The Salesforce developer couldn't get to my work yet. So I got access to a Salesforce sandbox, opened Claude Code, and did it myself.

The work wasn't conceptually hard. I needed a custom object to store product recommendations. I understood the data model. I understood what fields it needed and how it related to the opportunity. I just hadn't worked in Salesforce's environment before. The barrier wasn't competence. It was familiarity. AI closed that gap in an afternoon.

Now I'm doing the same with the Terraform. I understand the infrastructure I need. I've worked with every component individually. I just haven't written the Terraform to wire it all together. Same pattern: I know what I need, I understand the architecture, and AI helps me work productively in a tool I haven't used before.

I'm not claiming to be a Salesforce developer or a Terraform expert. But adding a custom object to Salesforce isn't rocket science. Writing Terraform for a Lambda function behind an API Gateway isn't building Kubernetes clusters. These are straightforward tasks in unfamiliar tools. The kind of tasks that would normally require weeks of coordination but only hours of actual work.

## **The Bigger Picture**

The coordination tax is one of the main reasons enterprise software moves slowly. When a single developer can work across stack boundaries, you don't just save that developer's time. You eliminate the meetings. You eliminate the prioritization discussions. You eliminate the context-switching for everyone involved. The Salesforce developer stays focused on his priorities. The platform engineer stays focused on hers. And the feature ships anyway.

This favors a certain kind of developer. Generalists who think in systems. Developers who are product-minded, who understand the full pipeline from sales call to user experience, and who are willing to step into unfamiliar territory. AI doesn't make you an expert in every tool. But it makes you productive enough in unfamiliar tools that you can stop waiting and start building.

The bottleneck in most organizations was never the engineering. It was the coordination. And that bottleneck is starting to disappear.