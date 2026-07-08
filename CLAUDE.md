# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local-only MCP (Model Context Protocol) server exposing read-only git operations (history, diffs, blame, status) as tools over stdio. It runs against a single local git repo passed at startup — it never talks to GitHub/GitLab or any remote API, and implements no write operations.

## Commands

```bash
npm run build     # tsc: compiles src/ → dist/
npm run dev       # tsc --watch
npm run lint      # eslint (typescript-eslint recommended-type-checked)
npm run format    # prettier --write src
node dist/index.js /path/to/some/git/repo   # run standalone (needs a target repo)
```

There are no tests configured.

To exercise the tools interactively (the server is silent over stdio otherwise):

```bash
npx @modelcontextprotocol/inspector node dist/index.js /path/to/some/git/repo
```

## Architecture

- [src/index.ts](src/index.ts) — entrypoint. Resolves the repo path once at startup, creates the `McpServer`, registers all 14 tools via the `register(...)` helper (which wraps every tool function in try/catch and returns `asText(...)` / `asError(...)`), and connects the stdio transport.
- [src/git.ts](src/git.ts) — shared infrastructure:
  - `resolveRepoPath()` — reads the repo path from `process.argv[2]` or `GIT_INSIGHTS_REPO_PATH`, validates `.git` exists, exits otherwise. This is the security boundary: the server is scoped to one repo for its lifetime and the model can never redirect it.
  - `getGit()` — returns a singleton `simple-git` instance (throws if ever called with a different repo path).
  - `assertPathInsideRepo()` — must be called on any model-supplied file path before use (blocks `../` traversal via a `path.relative` check).
  - `assertSafeRef()` — must be called on any model-supplied ref/branch/commit-hash before it reaches a git command (blocks flag injection like `--output=…` and range syntax `..`; ranges are composed internally from two validated refs).
- [src/util.ts](src/util.ts) — `truncate()` + `MAX_OUTPUT_CHARS` (15,000-char cap on large text output).
- [src/tools/](src/tools/) — one file per tool group. Each tool exports two things consumed by `index.ts`: a `*Schema` (a plain object of zod field definitions — not `z.object(...)`, since `McpServer.registerTool` takes the raw shape) and an async function taking `(repoPath, params)` and returning a plain serializable object. Param types are derived from the schema via `z.infer<z.ZodObject<typeof mySchema>>`, never hand-written. [src/tools/shared.ts](src/tools/shared.ts) has `toCommitSummary()` for the compact commit shape returned by history/search tools.

## Conventions when adding a tool

- Follow the existing pattern: define `mySchema` + `myTool(repoPath, params)` in the appropriate `src/tools/*.ts` file (deriving the params type with `z.infer`), then add one `register(...)` call in `src/index.ts`.
- Keep operations read-only — nothing that commits, pushes, or modifies the target repo.
- Validate any file-path parameter with `assertPathInsideRepo()` and any ref/hash parameter with `assertSafeRef()`. Prefer attached argument forms (`--grep=x`, `-Sx`) and terminate positional args with `--` where git supports it.
- Truncate potentially large output with `truncate()` from [src/util.ts](src/util.ts) to keep responses manageable for the LLM client.
- This is an ESM project (`"type": "module"`, `Node16` module resolution): relative imports must use the `.js` extension even in `.ts` source.
- Log to `console.error`, never `console.log` — stdout is the MCP stdio transport.
