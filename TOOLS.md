# git-insights-mcp — Tool Reference

This server exposes **14 read-only git tools** over MCP stdio. It is scoped to a single repo passed at startup (`node dist/index.js /path/to/repo` or the `GIT_INSIGHTS_REPO_PATH` env var) — it never modifies the repo and never talks to any remote API.

Each section below describes a tool, its parameters, and an example prompt you can paste into any MCP client (Claude Code, Claude Desktop, Cursor, etc.) to make the model call it. The prompts are repo-agnostic — swap the file names/branches for ones that exist in your target repo.

---

## Commit history

### 1. `list_recent_commits`

Get the most recent commits on a branch, with short hash, full hash, author, email, date, and message.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `count` | number (1–100, default 10) | no | Number of commits to return |
| `branch` | string | no | Branch or ref to read from (defaults to current branch) |

> **Prompt:** Show me the last 5 commits on this repo — who made them and when.

### 2. `search_commits`

Search commit messages for a keyword or phrase (`git log --grep`).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Keyword or phrase to search for in commit messages |
| `count` | number (1–100, default 20) | no | Max number of matching commits |

> **Prompt:** Find all commits whose message mentions "fix" and summarize what was fixed.

### 3. `search_diff_contents`

Find commits whose **diff** added or removed a given string (git pickaxe, `git log -S`) — great for "when was this function introduced/removed".

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | String to search for in diff contents |
| `count` | number (1–100, default 20) | no | Max number of matching commits |
| `filePath` | string | no | Restrict the search to one file (relative to repo root) |

> **Prompt:** Which commits introduced or removed the string "TODO" in this repo? Check the code changes, not just the commit messages.

---

## Diffs

### 4. `get_commit_diff`

Show the full diff and stats for a specific commit (output capped at 15,000 chars).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `commitHash` | string (min 4 chars) | yes | Commit hash, full or short |

> **Prompt:** Show me exactly what changed in commit abc1234 and explain it.

### 5. `get_diff_between_branches`

Diff and change summary between two branches or refs (`base...head`).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `base` | string | yes | Base branch or ref (e.g. `main`) |
| `head` | string | yes | Head branch or ref to compare (e.g. `feature/foo`) |

> **Prompt:** Compare the feature/foo branch against main — how many files changed and what are the key differences?

### 6. `get_working_tree_diff`

Uncommitted changes in the working tree, split into **staged** and **unstaged** diffs with per-section file/insertion/deletion counts.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | no | Restrict the diff to one file (relative to repo root) |

> **Prompt:** What uncommitted changes do I have right now? Separate what's staged from what's not.

---

## Branches, tags & status

### 7. `get_branch_status`

Current branch, tracking branch, ahead/behind counts, and any staged/modified/untracked/conflicted files. Takes no parameters.

> **Prompt:** What's the current state of this repo — which branch am I on, am I ahead or behind the remote, and is the working tree clean?

### 8. `list_branches`

List local (and optionally remote-tracking) branches.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `includeRemote` | boolean (default false) | no | Include remote-tracking branches |

> **Prompt:** List all branches in this repo, including the remote ones.

### 9. `list_tags`

List tags, newest first, with the latest tag and total count.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `count` | number (1–200, default 50) | no | Max number of tags to return |

> **Prompt:** What's the latest release tag in this repo, and list the recent tags.

---

## File-level history

### 10. `get_file_history`

Commit history for a specific file.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Path to the file, relative to the repo root |
| `count` | number (1–100, default 20) | no | Max number of commits to return |

> **Prompt:** Show me the change history of src/index.ts — every commit that touched it.

### 11. `blame_file`

Line-by-line commit/author attribution (`git blame`), optionally for a line range. Output capped at 500 lines (result includes a `truncated` flag).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Path to the file, relative to the repo root |
| `startLine` | number | no | First line of the range (requires `endLine`) |
| `endLine` | number | no | Last line of the range (requires `startLine`) |

> **Prompt:** Who wrote lines 10 to 40 of src/index.ts, and in which commits?

### 12. `get_file_at_ref`

Read a file's contents as of a given branch, tag, or commit (output capped at 15,000 chars).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Path to the file, relative to the repo root |
| `ref` | string (default `HEAD`) | no | Branch, tag, or commit hash to read the file at |

> **Prompt:** Show me what package.json looked like two commits ago (at HEAD~2) and tell me what has changed since.

---

## Analytics

### 13. `get_contributor_stats`

Commit counts per author (name + email) across the history of a ref (`git shortlog -sne`).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ref` | string (default `HEAD`) | no | Branch or ref whose history to summarize |

> **Prompt:** Who are the top contributors to this repo and how many commits does each have?

### 14. `get_file_churn`

Rank the most frequently changed files (hotspots) over recent history — useful for spotting refactor candidates.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `count` | number (1–100, default 20) | no | Number of top hotspot files to return |
| `commitLimit` | number (1–5000, default 500) | no | How many recent commits to sample |

> **Prompt:** Which files in this repo change most often? Give me the top 10 hotspots from the last 500 commits.

---

## One prompt to exercise everything

Paste this into your MCP client to smoke-test the server against any repo:

> Using the git-insights tools, give me a full health report of this repo: current branch status and uncommitted changes, the last 10 commits, top contributors, the 10 highest-churn files, all branches and the latest tag, and the diff of the most recent commit.

## Notes

- All file paths are validated to stay inside the repo (no `../` traversal), and all refs/hashes are validated against flag injection — invalid input returns an error result instead of running git.
- Large output (diffs, file contents) is truncated at 15,000 characters; blame at 500 lines.
