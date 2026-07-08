import { z } from "zod";
import { getGit, assertPathInsideRepo, assertSafeRef } from "../git.js";
import { truncate } from "../util.js";
export const getCommitDiffSchema = {
    commitHash: z.string().min(4).describe("Commit hash (full or short) to show the diff for"),
};
export async function getCommitDiff(repoPath, params) {
    const git = getGit(repoPath);
    assertSafeRef(params.commitHash);
    // show includes the commit message + diff; limit size to keep responses manageable
    const diff = await git.show([params.commitHash, "--stat", "--patch", "--"]);
    return { commitHash: params.commitHash, diff: truncate(diff) };
}
export const getDiffBetweenBranchesSchema = {
    base: z.string().describe("Base branch or ref (e.g. main)"),
    head: z.string().describe("Head branch or ref to compare against base (e.g. feature/foo)"),
};
export async function getDiffBetweenBranches(repoPath, params) {
    const git = getGit(repoPath);
    const range = `${assertSafeRef(params.base)}...${assertSafeRef(params.head)}`;
    const diff = await git.diff([range]);
    const summary = await git.diffSummary([range]);
    return {
        base: params.base,
        head: params.head,
        filesChanged: summary.files.length,
        insertions: summary.insertions,
        deletions: summary.deletions,
        diff: truncate(diff),
    };
}
export const getWorkingTreeDiffSchema = {
    filePath: z
        .string()
        .optional()
        .describe("Optional file path (relative to repo root) to restrict the diff to"),
};
export async function getWorkingTreeDiff(repoPath, params) {
    const git = getGit(repoPath);
    const pathArgs = [];
    if (params.filePath) {
        assertPathInsideRepo(repoPath, params.filePath);
        pathArgs.push("--", params.filePath);
    }
    const unstaged = await git.diff(pathArgs);
    const staged = await git.diff(["--cached", ...pathArgs]);
    const unstagedSummary = await git.diffSummary(pathArgs);
    const stagedSummary = await git.diffSummary(["--cached", ...pathArgs]);
    return {
        unstaged: {
            filesChanged: unstagedSummary.files.length,
            insertions: unstagedSummary.insertions,
            deletions: unstagedSummary.deletions,
            diff: truncate(unstaged),
        },
        staged: {
            filesChanged: stagedSummary.files.length,
            insertions: stagedSummary.insertions,
            deletions: stagedSummary.deletions,
            diff: truncate(staged),
        },
    };
}
