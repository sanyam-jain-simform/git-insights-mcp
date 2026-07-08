import { z } from "zod";
import { getGit, assertPathInsideRepo, assertSafeRef } from "../git.js";
import { toCommitSummary } from "./shared.js";
export const listRecentCommitsSchema = {
    count: z.number().min(1).max(100).default(10).describe("Number of commits to return"),
    branch: z.string().optional().describe("Branch or ref to read from (defaults to current branch)"),
};
export async function listRecentCommits(repoPath, params) {
    const git = getGit(repoPath);
    const log = await git.log({
        maxCount: params.count,
        ...(params.branch ? { from: assertSafeRef(params.branch) } : {}),
    });
    return log.all.map((c) => ({
        ...toCommitSummary(c),
        fullHash: c.hash,
        email: c.author_email,
    }));
}
export const searchCommitsSchema = {
    query: z.string().min(1).describe("Keyword or phrase to search for in commit messages"),
    count: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Max number of matching commits to return"),
};
export async function searchCommits(repoPath, params) {
    const git = getGit(repoPath);
    // `--grep=` keeps the query attached so a leading "-" can't become a flag
    const log = await git.log([`--grep=${params.query}`, "-n", String(params.count)]);
    return log.all.map(toCommitSummary);
}
export const searchDiffContentsSchema = {
    query: z
        .string()
        .min(1)
        .describe("String to search for in diff contents (git pickaxe: commits that added or removed it)"),
    count: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Max number of matching commits to return"),
    filePath: z
        .string()
        .optional()
        .describe("Optional file path (relative to repo root) to restrict the search to"),
};
export async function searchDiffContents(repoPath, params) {
    const git = getGit(repoPath);
    const args = [`-S${params.query}`, "-n", String(params.count)];
    if (params.filePath) {
        assertPathInsideRepo(repoPath, params.filePath);
        args.push("--", params.filePath);
    }
    const log = await git.log(args);
    return log.all.map(toCommitSummary);
}
