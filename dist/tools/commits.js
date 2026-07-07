import { z } from "zod";
import { getGit } from "../git.js";
export const listRecentCommitsSchema = {
    count: z.number().min(1).max(100).default(10).describe("Number of commits to return"),
    branch: z.string().optional().describe("Branch or ref to read from (defaults to current branch)"),
};
export async function listRecentCommits(repoPath, params) {
    const git = getGit(repoPath);
    const count = params.count ?? 10;
    const log = await git.log({
        maxCount: count,
        ...(params.branch ? { from: params.branch } : {}),
    });
    return log.all.map((c) => ({
        hash: c.hash.slice(0, 7),
        fullHash: c.hash,
        author: c.author_name,
        email: c.author_email,
        date: c.date,
        message: c.message,
    }));
}
export const searchCommitsSchema = {
    query: z.string().min(1).describe("Keyword or phrase to search for in commit messages"),
    count: z.number().min(1).max(100).default(20).describe("Max number of matching commits to return"),
};
export async function searchCommits(repoPath, params) {
    const git = getGit(repoPath);
    const log = await git.log({
        maxCount: params.count ?? 20,
        "--grep": params.query,
    });
    return log.all.map((c) => ({
        hash: c.hash.slice(0, 7),
        author: c.author_name,
        date: c.date,
        message: c.message,
    }));
}
