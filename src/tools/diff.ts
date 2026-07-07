import { z } from "zod";
import { getGit } from "../git.js";

export const getCommitDiffSchema = {
  commitHash: z.string().min(4).describe("Commit hash (full or short) to show the diff for"),
};

export async function getCommitDiff(repoPath: string, params: { commitHash: string }) {
  const git = getGit(repoPath);
  // show includes the commit message + diff; limit size to keep responses manageable
  const diff = await git.show([params.commitHash, "--stat", "--patch"]);
  return { commitHash: params.commitHash, diff: truncate(diff, 15000) };
}

export const getDiffBetweenBranchesSchema = {
  base: z.string().describe("Base branch or ref (e.g. main)"),
  head: z.string().describe("Head branch or ref to compare against base (e.g. feature/foo)"),
};

export async function getDiffBetweenBranches(
  repoPath: string,
  params: { base: string; head: string }
) {
  const git = getGit(repoPath);
  const diff = await git.diff([`${params.base}...${params.head}`]);
  const summary = await git.diffSummary([`${params.base}...${params.head}`]);
  return {
    base: params.base,
    head: params.head,
    filesChanged: summary.files.length,
    insertions: summary.insertions,
    deletions: summary.deletions,
    diff: truncate(diff, 15000),
  };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n\n... [truncated, ${text.length - maxLen} more characters]`;
}
