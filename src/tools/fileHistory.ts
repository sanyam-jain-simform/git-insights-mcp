import { z } from "zod";
import { getGit, assertPathInsideRepo, assertSafeRef } from "../git.js";
import { truncate } from "../util.js";
import { toCommitSummary } from "./shared.js";

export const getFileHistorySchema = {
  filePath: z.string().min(1).describe("Path to the file, relative to the repo root"),
  count: z.number().min(1).max(100).default(20).describe("Max number of commits to return"),
};
type GetFileHistoryParams = z.infer<z.ZodObject<typeof getFileHistorySchema>>;

export async function getFileHistory(repoPath: string, params: GetFileHistoryParams) {
  assertPathInsideRepo(repoPath, params.filePath);
  const git = getGit(repoPath);

  const log = await git.log({
    file: params.filePath,
    maxCount: params.count,
  });

  return log.all.map(toCommitSummary);
}

const MAX_BLAME_LINES = 500;

export const blameFileSchema = {
  filePath: z.string().min(1).describe("Path to the file, relative to the repo root"),
  startLine: z
    .number()
    .min(1)
    .optional()
    .describe("First line of the range to blame (requires endLine)"),
  endLine: z
    .number()
    .min(1)
    .optional()
    .describe("Last line of the range to blame (requires startLine)"),
};
type BlameFileParams = z.infer<z.ZodObject<typeof blameFileSchema>>;

export async function blameFile(repoPath: string, params: BlameFileParams) {
  assertPathInsideRepo(repoPath, params.filePath);
  const git = getGit(repoPath);

  const rangeArgs: string[] = [];
  if (params.startLine !== undefined || params.endLine !== undefined) {
    if (params.startLine === undefined || params.endLine === undefined) {
      throw new Error("startLine and endLine must be provided together.");
    }
    if (params.endLine < params.startLine) {
      throw new Error("endLine must be >= startLine.");
    }
    rangeArgs.push("-L", `${params.startLine},${params.endLine}`);
  }

  // simple-git doesn't have a typed blame helper, so use raw()
  const raw = await git.raw(["blame", "--line-porcelain", ...rangeArgs, "--", params.filePath]);

  // Parse the porcelain format into compact per-line entries
  const lines = raw.split("\n");
  const entries: { hash: string; author: string; line: string }[] = [];
  let currentHash = "";
  let currentAuthor = "";
  let totalLines = 0;

  for (const line of lines) {
    if (/^[0-9a-f]{40}/.test(line)) {
      currentHash = line.split(" ")[0].slice(0, 7);
    } else if (line.startsWith("author ")) {
      currentAuthor = line.replace("author ", "");
    } else if (line.startsWith("\t")) {
      totalLines++;
      if (entries.length < MAX_BLAME_LINES) {
        entries.push({ hash: currentHash, author: currentAuthor, line: line.slice(1) });
      }
    }
  }

  return {
    filePath: params.filePath,
    lineCount: totalLines,
    truncated: totalLines > entries.length,
    blame: entries,
  };
}

export const getFileAtRefSchema = {
  filePath: z.string().min(1).describe("Path to the file, relative to the repo root"),
  ref: z
    .string()
    .default("HEAD")
    .describe("Branch, tag, or commit hash to read the file at (defaults to HEAD)"),
};
type GetFileAtRefParams = z.infer<z.ZodObject<typeof getFileAtRefSchema>>;

export async function getFileAtRef(repoPath: string, params: GetFileAtRefParams) {
  assertPathInsideRepo(repoPath, params.filePath);
  assertSafeRef(params.ref);
  const git = getGit(repoPath);

  // git object specs always use forward slashes, even on Windows
  const spec = `${params.ref}:${params.filePath.replace(/\\/g, "/")}`;
  const content = await git.show([spec]);

  return { ref: params.ref, filePath: params.filePath, content: truncate(content) };
}
