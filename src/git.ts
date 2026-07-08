import { simpleGit, SimpleGit } from "simple-git";
import path from "node:path";
import fs from "node:fs";

/**
 * Resolves and validates the repo path this server is allowed to operate on.
 * The server is scoped to a single repo at startup (passed via CLI arg or env var)
 * so the model can never point it at an arbitrary filesystem path.
 */
export function resolveRepoPath(): string {
  const raw = process.argv[2] || process.env.GIT_INSIGHTS_REPO_PATH;
  if (!raw) {
    console.error(
      "Missing repo path. Usage: git-insights-mcp <path-to-git-repo>\n" +
        "or set GIT_INSIGHTS_REPO_PATH env var.",
    );
    process.exit(1);
  }

  const resolved = path.resolve(raw);
  // .git is a directory in a normal checkout and a file in worktrees/submodules;
  // existsSync accepts both.
  const gitDir = path.join(resolved, ".git");

  if (!fs.existsSync(resolved) || !fs.existsSync(gitDir)) {
    console.error(`"${resolved}" does not look like a git repository (no .git found).`);
    process.exit(1);
  }

  return resolved;
}

let gitInstance: SimpleGit | null = null;
let gitBaseDir: string | null = null;

export function getGit(repoPath: string): SimpleGit {
  if (!gitInstance) {
    gitInstance = simpleGit({ baseDir: repoPath, maxConcurrentProcesses: 1 });
    gitBaseDir = repoPath;
  } else if (gitBaseDir !== repoPath) {
    throw new Error(
      `getGit() called with "${repoPath}" but the server is scoped to "${gitBaseDir}".`,
    );
  }
  return gitInstance;
}

/**
 * Basic safety helper: ensures a file path parameter supplied by the model
 * stays inside the repo (no path traversal via ../../ etc.)
 */
export function assertPathInsideRepo(repoPath: string, target: string): string {
  const resolvedRepo = path.resolve(repoPath);
  const resolvedTarget = path.resolve(resolvedRepo, target);
  const rel = path.relative(resolvedRepo, resolvedTarget);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path "${target}" resolves outside the repository. Refusing to proceed.`);
  }
  return resolvedTarget;
}

/**
 * Safety helper for model-supplied refs (branch names, tags, commit hashes,
 * revision expressions like HEAD~2). Blocks git flag injection (leading "-"),
 * range syntax (".."), and anything outside a conservative ref charset.
 * Tools that need a range must compose it from two individually-validated refs.
 */
export function assertSafeRef(ref: string): string {
  const valid = /^[A-Za-z0-9._/@{}^~-]+$/.test(ref) && !ref.startsWith("-") && !ref.includes("..");
  if (!valid) {
    throw new Error(`"${ref}" is not a valid git ref or commit hash. Refusing to proceed.`);
  }
  return ref;
}
