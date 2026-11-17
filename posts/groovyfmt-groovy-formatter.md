---
title: "groovyfmt: A Fast, Safe Formatter for Groovy, Gradle and Jenkinsfiles"
subtitle: "Tested on 691 open source repositories, with real bugs found and fixes merged upstream"
date: 2026-11-17
readTime: 2
cover: "/assets/covers/groovyfmt-groovy-formatter.png"
tags: ["groovy", "gradle", "jenkins", "developer-tools", "open-source", "rust"]
seoTitle: "groovyfmt, a Fast, Safe Formatter for Groovy, Gradle and Jenkinsfiles"
seoDescription: "groovyfmt formats and lints Groovy, Gradle and Jenkinsfiles in one Rust binary. Tested on 691 open source repos, it found real bugs now fixed in Apache Solr, Beam and Spinnaker."
---


Groovy runs a huge share of the world's builds and CI. Every Gradle build written in the Groovy DSL and every Jenkinsfile is Groovy. Yet it has never had a quick, dependable formatter you can drop into a pre-commit hook or a CI step. groovyfmt is that tool.

## What it does

groovyfmt formats and lints Groovy, Gradle build scripts and Jenkinsfiles. It's a single native binary written in Rust, so there's no JVM to start and a whole repository formats in seconds. It can fix many lint findings automatically, reads existing CodeNarc configs, and plugs into VS Code, IntelliJ, GitHub Actions and pre-commit.

**It never changes what your code does.** Every formatting change is checked against the syntax tree Groovy's own compiler builds, on Groovy 2.4, 3 and 4.

**It catches real bugs.** The linter flags the mistakes that hide in build scripts and pipelines for years, like a `throw` missing `new`, an `instanceof` check that can never be true, or a pipeline that no longer loads.

## Tested on 691 open source repositories

Before calling it ready, groovyfmt ran against 691 real open source repositories, from Apache, Spring, Netflix and Google projects to Jenkins shared libraries, Grails apps, Gradle plugins and Spock test suites. Formatting never changed the meaning of a single file.

Along the way it found real bugs in those projects. Fixes have been merged in Apache Solr, Apache Beam, Spinnaker, GoCD, ScyllaDB and others, nine so far. Most were the kind nobody notices until something breaks, such as error paths that crash with the wrong exception, validation that silently never runs, and pipeline files that can't compile. One pattern turned up so often in Spock test suites that it became its own rule. A check placed inside an `if` or a loop is never actually asserted, so the test can never fail. Fixes for those are open in Spinnaker, graphql-java, Netflix metacat and Nextflow.

## Who it's for

**Platform and CI teams** who own Jenkinsfiles and shared libraries and want them consistent and checked in review.

**Gradle users** with Groovy DSL builds, from single projects to large multi-module builds.

**Groovy, Grails and Spock developers** who want the same fast formatting other languages take for granted.

## Try it

```bash
brew install costajohnt/tap/groovyfmt
groovyfmt --check .
```

It's also on npm, crates.io and the VS Code Marketplace. Source and docs are at [github.com/costajohnt/groovyfmt](https://github.com/costajohnt/groovyfmt).
