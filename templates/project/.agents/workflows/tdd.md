# TDD Workflow

Use this workflow when a bead or approved task needs test-first implementation.

## Goal

Create an implementation-ready TDD spec for one bead or one small task.

## Inputs

- A bead id such as `br-123`, or
- An approved plan slice with clear acceptance criteria.

If the request is broad or lacks expected behavior, route to `plan.md` first.

## Process

1. Read the bead with `br show <id> --json` when a bead id is provided.
2. Inspect public interfaces and existing test patterns before designing tests.
3. Define the public behavior to prove, not internal implementation details.
4. Choose the first tracer bullet: one test that proves one end-to-end behavior.
5. Define the red/green/refactor loop for remaining behaviors.
6. Identify the exact verification command.
7. Save the TDD spec where the executor can find it:
   - Prefer a Beads comment/body update when the installed `br` supports it.
   - Otherwise write `.codexkit/tdd/<bead-id>.md`.

## TDD Spec Shape

```markdown
# TDD Spec: <bead-id or task title>

## Public Interface

What interface or user-visible behavior is being exercised.

## Behaviors

- [ ] Behavior 1
- [ ] Behavior 2

## First Tracer Bullet

- RED: test to write
- GREEN: minimum implementation
- Verification: command to run

## Incremental Loop

One behavior per red-green cycle. Do not write all tests before implementation.

## Refactor Checks

- tests remain behavior-focused
- no implementation-detail coupling
- all verification commands pass
```

## Rules

- Do not write all tests up front.
- Do not mock internal collaborators just to make tests easier.
- Tests should survive refactors that preserve behavior.
- If the first test cannot be described through a public interface, stop and ask for an interface decision.

## Output Shape

- TDD spec location
- first test to write
- verification command
- whether the bead is ready for `execute`
