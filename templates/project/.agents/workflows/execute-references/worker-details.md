# Execute Worker Details

Open this when Assigned Bead Execution needs exact worker fields, commands, or failure handling.

## Parent Context

The orchestrator supplies:

- Codex nickname
- agent id
- epic id when available
- feature name when available
- project root
- exactly one assigned Bead id
- affected scope
- expected output
- optional startup hint

Use the Codex nickname as the reservation identity.

## Assigned Bead Check

Workers do not pick Beads. For the assigned Bead, confirm:

- `br show <assigned-bead-id>` succeeds
- status is open
- dependencies are satisfied
- required file scope is clear enough to reserve
- acceptance criteria and verification criteria are concrete
- referenced decisions or context are understandable

Return `[NOOP]` if the assigned Bead is unavailable or no longer actionable. Return `[BLOCKED]` when the Bead is ambiguous, blocked, or inconsistent with locked context.

## Reservation Conflict

If reservation fails, do not edit through the conflict. Return `[BLOCKED]` with:

- Bead id
- requested paths
- conflicting holder
- parent action needed

## Shell Guard

Prefix write-heavy shell commands with:

```bash
CODEXKIT_AGENT_NAME="<codex-subagent-name>" git add src/foo.ts
```

Use this for `git add/mv/rm`, `mv`, `cp`, `rm`, `mkdir`, `touch`, in-place edits, `tee`, and redirection writes.

## Verification Failure

Run the Bead's verification exactly. Fix the root cause and rerun the failing command. After two serious failed attempts, return `[BLOCKED]` with:

- command
- failure summary
- attempts made
- diagnosis
- smallest useful next decision

## Result Fields

`[DONE]` means implementation is complete, Bead-level verification passed, and reservations were released. It does not mean the Bead was closed or committed; only the main thread may close or commit after aggregate validation and user approval.

Minimum fields:

- status line
- Codex nickname
- agent id
- Bead id
- files touched or requested
- reservation outcome
- verification result
- parent next action

## Result Templates

```text
[DONE] <bead-id>: <summary>
Codex nickname: <name>
Agent id: <id>
Files modified: <paths>
Reservations: reserved <paths>; released <yes/no>
Verification: <command/result>
Next action: <user close approval / commit approval / none>
```

```text
[BLOCKED] <bead-id> - <summary>
Codex nickname: <name>
Requested files: <paths>
Blocker: <conflict/failing condition/missing decision>
What happened: <description>
What I need next: <specific parent or user action>
Reservations: <released / active paths>
```

```text
[HANDOFF] <bead-id>
Reason: <context high / safe pause / external wait>
Progress: <done>
Reservations: <active paths or none>
Resume: read .codexkit/HANDOFF.json, br show <id>, reservation list
```

```text
[NOOP] <bead-id or none>
Reason: <assignment unavailable, already closed, unsafe, or out of scope>
Suggested next action: <triage, clear blocker, or respawn later>
```

## Invalid Or Incomplete Results

The final worker message must start with exactly one status: `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`.

If the worker cannot provide verification evidence, reservation outcome, or the assigned Bead id, return `[BLOCKED]` instead of an informal summary. The orchestrator must not infer `[DONE]` from prose.

## Aggregate-Fix Assignment

When a worker is reassigned after aggregate validation fails, it is still executing the same assigned Bead. The parent must provide the mapped Bead id, original worker result, aggregate failing command and output, suspected files, reservation expectations, and success criteria.

The worker must not broaden scope to unrelated failures. Reserve only the needed files, fix the mapped Bead root cause, run the Bead verification plus the aggregate failing command, release reservations, and return one final status.

## Post-Compaction Recovery

Reread:

1. `AGENTS.md`
2. `.codexkit/HANDOFF.json` when present
3. `.codexkit/state.json`
4. `br show <bead-id>`
5. `node .codex/codexkit_reservations.mjs list --active-only --agent "<name>" --json`
6. `git status`
