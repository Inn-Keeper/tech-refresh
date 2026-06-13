# AGENTS.md

## Repository Guidelines

This repository contains a TypeScript/JavaScript product with shared packages and application code.

## Working Principles

* Keep changes small, focused, and reviewable.
* Avoid unrelated refactors.
* Prefer existing project patterns over introducing new ones.
* Do not add production dependencies without explaining why they are needed.
* Do not hardcode repeated product strings, colors, or configuration when shared constants/tokens already exist.
* Preserve accessibility, responsive behavior, and type safety.

## Before Making Changes

* Inspect the relevant files first.
* Identify existing conventions for imports, naming, styling, testing, and folder structure.
* Prefer modifying the smallest necessary surface area.
* Ask questions.

## After Making Changes

Run the most relevant checks available in the project, such as:

* typecheck
* lint
* tests
* build

If a command is unavailable or fails because of unrelated existing issues, summarize what happened clearly.

## Brand and Product Identity

The canonical brand source is `BRAND.md`.

When a task involves product naming, UI copy, app metadata, visual identity, mascot usage, icons, splash screens, onboarding, empty states, or milestone screens, read `BRAND.md` before making changes.

Do not assume brand details from memory. Use `BRAND.md` as the source of truth.

## Review Expectations

When summarizing work, include:

* files changed
* commands run
* any skipped checks
* any TODOs or manual follow-up needed
