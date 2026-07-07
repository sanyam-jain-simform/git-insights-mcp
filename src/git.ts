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
  const gitDir = path.join(resolved, ".git");

  if (!fs.existsSync(resolved) || !fs.existsSync(gitDir)) {
    console.error(
      `"${resolved}" does not look like a git repository (no .git folder found).`,
    );
    process.exit(1);
  }

  return resolved;
}

let gitInstance: SimpleGit | null = null;

export function getGit(repoPath: string): SimpleGit {
  if (!gitInstance) {
    gitInstance = simpleGit({ baseDir: repoPath, maxConcurrentProcesses: 1 });
  }
  return gitInstance;
}

/**
 * Basic safety helper: ensures a file path parameter supplied by the model
 * stays inside the repo (no path traversal via ../../ etc.)
 */
export function assertPathInsideRepo(repoPath: string, target: string): string {
  const resolvedTarget = path.resolve(repoPath, target);
  if (!resolvedTarget.startsWith(path.resolve(repoPath))) {
    throw new Error(
      `Path "${target}" resolves outside the repository. Refusing to proceed.`,
    );
  }
  return resolvedTarget;
}
