import { z } from "zod";
import { getGit, assertSafeRef } from "../git.js";
export const getContributorStatsSchema = {
    ref: z
        .string()
        .default("HEAD")
        .describe("Branch or ref whose history to summarize (defaults to HEAD)"),
};
export async function getContributorStats(repoPath, params) {
    assertSafeRef(params.ref);
    const git = getGit(repoPath);
    // shortlog needs an explicit rev, otherwise it tries to read from stdin
    const raw = await git.raw(["shortlog", "-sne", params.ref]);
    const contributors = raw
        .split("\n")
        .map((line) => /^\s*(\d+)\t(.+?)\s+<(.*)>$/.exec(line))
        .filter((m) => m !== null)
        .map((m) => ({ commits: Number(m[1]), name: m[2], email: m[3] }));
    return { ref: params.ref, contributorCount: contributors.length, contributors };
}
export const getFileChurnSchema = {
    count: z.number().min(1).max(100).default(20).describe("Number of top hotspot files to return"),
    commitLimit: z
        .number()
        .min(1)
        .max(5000)
        .default(500)
        .describe("How many recent commits to sample"),
};
export async function getFileChurn(repoPath, params) {
    const git = getGit(repoPath);
    const raw = await git.raw([
        "log",
        "--name-only",
        "--pretty=format:",
        "-n",
        String(params.commitLimit),
    ]);
    const counts = new Map();
    for (const line of raw.split("\n")) {
        const file = line.trim();
        if (file)
            counts.set(file, (counts.get(file) ?? 0) + 1);
    }
    const hotspots = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, params.count)
        .map(([filePath, changeCount]) => ({ filePath, changeCount }));
    return { commitsSampled: params.commitLimit, hotspots };
}
