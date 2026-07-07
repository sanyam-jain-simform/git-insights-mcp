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
