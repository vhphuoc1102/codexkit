---
name: tdd-workflow
description: Test-driven development with red-green-refactor, test-first development, public-interface testing, and integration-style tests for feature work and bug fixes.
---

# TDD Workflow

Use this skill when the user wants test-first development, mentions red-green-refactor, asks for a bug fix with a regression test, or wants implementation guided by behavior tests.

## Principle

Tests are executable specifications. They should verify behavior through public interfaces, not implementation details.

Good tests exercise real code paths through the same interface a caller or user would use. They describe what the system does, not how the internals are arranged. These tests survive refactors because internal structure can change without changing observed behavior.

Bad tests are coupled to implementation. They mock internal collaborators, test private methods, assert call order, or query state through a path users do not have. If renaming an internal function breaks a test while behavior is unchanged, the test was too close to the implementation.

Load these references when the task needs detail:

- `tests.md` for good and bad test examples
- `mocking.md` for boundary mocking rules
- `interface-design.md` for testable public interfaces
- `deep-modules.md` for keeping interfaces small and implementations deep
- `refactoring.md` for cleanup after tests are green

## Avoid Horizontal Slices

Do not write all tests first and then all implementation. That treats RED as a bulk planning phase and usually produces brittle tests for imagined behavior.

Use vertical slices instead:

```text
RED -> GREEN: one behavior test -> minimal implementation
RED -> GREEN: next behavior test -> minimal implementation
RED -> GREEN: next behavior test -> minimal implementation
REFACTOR: improve structure while tests stay green
```

Each test should respond to what the previous cycle taught you.

## Workflow

### 1. Plan The Public Behavior

Before writing code:

- identify the public interface that should carry the behavior
- list the user-visible or caller-visible behaviors to test
- prioritize critical paths, complex logic, and known failure modes
- decide which existing test command proves the cycle
- use project vocabulary from docs, domain files, and existing tests

If the public interface or behavior priority is ambiguous, ask before implementing.

### 2. Write One Failing Test

Write one test for one behavior.

Rules:

- test through the public interface
- assert observable behavior
- keep the setup as realistic as the repo allows
- mock only system boundaries
- run the test and confirm it fails for the expected reason

### 3. Make It Pass

Write the smallest production change that makes the current test pass.

Rules:

- do not add speculative features
- do not optimize yet
- do not satisfy future tests early
- run the focused test until it passes

### 4. Repeat In Small Slices

For each remaining behavior, repeat RED then GREEN. Keep every cycle narrow enough that a failing test points to one missing behavior.

### 5. Refactor While Green

After the behavior set is covered and tests are green:

- remove duplication
- deepen modules by hiding complexity behind smaller interfaces
- improve names and boundaries
- apply local project patterns
- run tests after each meaningful refactor

Never refactor while RED. First get back to GREEN.

## Cycle Checklist

Before moving on from each cycle:

- the test describes behavior, not implementation
- the test uses a public interface
- the test would survive an internal refactor
- boundary mocks are explicit and minimal
- production code is only as large as the current behavior needs
- the focused test command passes

## Pairing With CodexKit

- Use `testing-patterns` when choosing test levels, fixtures, or framework conventions.
- Use `test-hardening` when strengthening weak coverage around existing behavior.
- Use `bug-hunt` or `systematic-debugging` before TDD if the failure mode is not understood.
- Use `clean-code` during the REFACTOR phase, not while RED.
