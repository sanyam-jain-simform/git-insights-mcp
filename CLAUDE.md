# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local-only MCP (Model Context Protocol) server exposing read-only git operations (history, diffs, blame, status) as tools over stdio. It runs against a single local git repo passed at startup — it never talks to GitHub/GitLab or any remote API, and implements no write operations.

## Commands

```bash
npm run build     # tsc: compiles src/ → dist/
npm run dev       # tsc --watch
node dist/index.js /path/to/some/git/repo   # run standalone (needs a target repo)
```

There are no tests or linters configured.

To exercise the tools interactively (the server is silent over stdio otherwise):

```bash
npx @modelcontextprotocol/inspector node dist/index.js /path/to/some/git/repo
```

## Architecture

- [src/index.ts](src/index.ts) — entrypoint. Resolves the repo path once at startup, creates the `McpServer`, registers all 8 tools, and connects the stdio transport. Every tool handler follows the same pattern: wrap the tool function in try/catch, return `asText(...)` (JSON-stringified result) or `asError(...)`.
- [src/git.ts](src/git.ts) — shared infrastructure:
  - `resolveRepoPath()` — reads the repo path from `process.argv[2]` or `GIT_INSIGHTS_REPO_PATH`, validates a `.git` folder exists, exits otherwise. This is the security boundary: the server is scoped to one repo for its lifetime and the model can never redirect it.
  - `getGit()` — returns a singleton `simple-git` instance.
  - `assertPathInsideRepo()` — must be called on any model-supplied file path before use (blocks `../` traversal). `get_file_history` and `blame_file` do this.
- [src/tools/](src/tools/) — one file per tool pair. Each tool exports two things consumed by `index.ts`: a `*Schema` (a plain object of zod field definitions — not `z.object(...)`, since `McpServer.registerTool` takes the raw shape) and an async function taking `(repoPath, params)` and returning a plain serializable object.

## Conventions when adding a tool

- Follow the existing pattern: define `mySchema` + `myTool(repoPath, params)` in the appropriate `src/tools/*.ts` file, then register it in `src/index.ts` with the try/catch + `asText`/`asError` wrapper.
- Keep operations read-only — nothing that commits, pushes, or modifies the target repo.
- Validate any file-path parameter with `assertPathInsideRepo()`.
- Truncate potentially large output (diffs use a 15,000-char cap via `truncate()` in [src/tools/diff.ts](src/tools/diff.ts)) to keep responses manageable for the LLM client.
- This is an ESM project (`"type": "module"`, `Node16` module resolution): relative imports must use the `.js` extension even in `.ts` source.
- Log to `console.error`, never `console.log` — stdout is the MCP stdio transport.
