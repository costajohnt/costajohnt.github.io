---
title: "The Era of Rust Rewrites"
subtitle: "AI made rewrites cheap, so I rewrote RuboCop in Rust to see what's left"
date: 2026-10-25
readTime: 3
cover: "/assets/covers/era-of-rust-rewrites.png"
tags: ["rust", "ruby", "rubocop", "ai", "claude-code", "developer-tools", "performance"]
seoTitle: "The Era of Rust Rewrites: Porting RuboCop to Rust with AI"
seoDescription: "AI agents made rewriting software in Rust cheap. Agents ported all 613 RuboCop rules to Rust in nine hours, and proving the output was identical took two more days."
---

At Rails World in September, DHH said he hates Rust "with a passion." Then he announced HEY's backend is moving to it. Agents write the code, he doesn't read it, and the new backend needs 99% less CPU and 95% less memory. This from the person who spent twenty years arguing that developer happiness beats CPU cycles.

The reason is cost. Rust has been the answer for slow tools for years, and Ruff and uv proved users will switch for the speed. But learning the language and writing all that verbose code took months, paid up front, before you knew anyone would use it. Most rewrites never justified the bill.

Agents changed the bill. A rewrite takes days now, with the original program as the spec. That makes rewriting slow, popular tools in Rust an arbitrage.

## rbcop

So I rewrote RuboCop, the linter almost every Ruby project runs. rbcop is a drop-in replacement with the same config, command line and output. [nitrocop](https://github.com/6/nitrocop) has chased the same idea since February. rbcop's bet is exact output, full autocorrect and a gem you can install today.

Agents ported all 613 of RuboCop's rules in about nine hours. Getting the output identical took two more days, and hardening it for release took two weeks.

## The speed

In CI with a cold cache, rbcop is about 14 times faster than `rubocop --parallel`.

| Codebase | `rubocop --parallel` | rbcop |
|---|---:|---:|
| rails | 51 s | 2.6 s |
| discourse | 141 s | 10.2 s |
| mastodon | 61 s | 6.1 s |

## The real cost

Agents made the code cheap. Checking it set the pace.

An agent that's wrong sounds exactly like one that's right, so every port and every fix had to match the real RuboCop before it merged. Across nine large codebases, that's about two million offenses and zero differences.

That's what makes a rewrite safe now. The best candidates are slow, widely used tools you can run side by side with your own. There are plenty of them.

---

*rbcop is MIT licensed and [on GitHub](https://github.com/costajohnt/rbcop). Add `gem "rbcop", require: false` and run `bundle exec rbcop`, or use `costajohnt/rbcop@v0.1.2` in GitHub Actions. If it disagrees with RuboCop anywhere, that's a bug, and I want the issue.*

*rbcop is a port of RuboCop, created by Bozhidar Batsov. Its cops, messages and default config are his and RuboCop's contributors' work, used under the MIT license.*

