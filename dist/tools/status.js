import { z } from "zod";
import { getGit } from "../git.js";
export const getBranchStatusSchema = {};
export async function getBranchStatus(repoPath) {
    const git = getGit(repoPath);
    const status = await git.status();
    return {
        currentBranch: status.current,
        trackingBranch: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        notAdded: status.not_added,
        deleted: status.deleted,
        conflicted: status.conflicted,
        isClean: status.isClean(),
    };
}
export const listBranchesSchema = {
    includeRemote: z.boolean().default(false).describe("Include remote-tracking branches"),
};
export async function listBranches(repoPath, params) {
    const git = getGit(repoPath);
    const branches = params.includeRemote ? await git.branch(["-a"]) : await git.branchLocal();
    return {
        current: branches.current,
        all: branches.all,
    };
}
export const listTagsSchema = {
    count: z.number().min(1).max(200).default(50).describe("Max number of tags to return"),
};
export async function listTags(repoPath, params) {
    const git = getGit(repoPath);
    const tags = await git.tags(["--sort=-creatordate"]);
    return {
        latest: tags.all[0] ?? null,
        total: tags.all.length,
        tags: tags.all.slice(0, params.count),
    };
}
