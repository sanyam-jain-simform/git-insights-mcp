# git-insights-mcp

A local-only MCP (Model Context Protocol) server that exposes **git repository
history, diffs, and status** as tools an LLM client (e.g. Claude Desktop) can
call in natural language.

It works entirely against a **local git repo on disk** — it never talks to
GitHub, GitLab, or any remote API. No auth, no tokens.

## Tools exposed

| Tool | Description |
|---|---|
| `list_recent_commits` | Recent commits (author, date, message) on a branch |
| `search_commits` | Search commit messages by keyword |
| `get_commit_diff` | Full diff + stats for one commit |
| `get_diff_between_branches` | Diff/summary between two branches or refs |
| `get_branch_status` | Current branch, ahead/behind, uncommitted changes |
| `list_branches` | Local (or local + remote-tracking) branches |
| `get_file_history` | Commit history for a specific file |
| `blame_file` | Line-by-line author/commit attribution (git blame) |

Safety notes:
- The server is scoped to **one repo path**, given at startup. The model can
  never point it at an arbitrary path on your machine.
- File-path parameters (`get_file_history`, `blame_file`) are checked to make
  sure they resolve inside the repo — no `../../` traversal.
- Only read-only git operations are implemented — nothing here can commit,
  push, or modify your repo.

## Setup

```bash
npm install
npm run build
```

This compiles TypeScript from `src/` into `dist/`.

## Running it standalone (sanity check)

```bash
node dist/index.js /path/to/some/git/repo
```

You should see:
```
git-insights-mcp running (stdio) against repo: /path/to/some/git/repo
```

It communicates over stdio using the MCP protocol, so it won't print
anything else unless a client sends it requests. Press Ctrl+C to stop.

## Inspecting it with MCP Inspector (recommended first step)

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) lets
you call tools directly through a web UI, without needing Claude Desktop:

```bash
npx @modelcontextprotocol/inspector node dist/index.js /path/to/some/git/repo
```

This opens a browser UI where you can see all 8 tools, fill in their
parameters, and inspect raw responses.

## Connecting to Claude Desktop

1. Find your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add an entry under `mcpServers` (use the **absolute** path to this
   project's `dist/index.js`, and the absolute path to the repo you want to
   inspect):

```json
{
  "mcpServers": {
    "git-insights": {
      "command": "node",
      "args": [
        "/absolute/path/to/git-insights-mcp/dist/index.js",
        "/absolute/path/to/your/target/repo"
      ]
    }
  }
}
```

3. Restart Claude Desktop. You should see a 🔨 tools icon indicating the
   server connected, and the 8 tools available for Claude to call.

4. Try prompts like:
   - "Summarize the last 10 commits on this repo"
   - "Show me the diff for commit `<hash>`"
   - "Who's touched `src/index.ts` the most recently?"
   - "What files changed between `main` and `feature/foo`?"
   - "Is my working directory clean right now?"

## Project structure

```
git-insights-mcp/
├── src/
│   ├── index.ts          # server entrypoint, tool registration, transport setup
│   ├── git.ts            # repo path resolution + safety helpers
│   └── tools/
│       ├── commits.ts    # list_recent_commits, search_commits
│       ├── diff.ts       # get_commit_diff, get_diff_between_branches
│       ├── status.ts     # get_branch_status, list_branches
│       └── fileHistory.ts# get_file_history, blame_file
├── package.json
├── tsconfig.json
└── README.md
```

## Ideas for extending this

- Add a `prompts` entry like `weekly_summary` that pre-packages "summarize
  commits from the last 7 days, grouped by author"
- Expose `repo://status` as an MCP **resource** so it's always available as
  context without an explicit tool call
- Add a `get_pr_style_summary` tool that formats a diff as a draft PR
  description
- Add a second set of tools wrapping the GitHub API (via `@octokit/rest`) for
  PRs/issues — a natural "part 2" once this local version is working
