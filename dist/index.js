#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveRepoPath } from "./git.js";
import { listRecentCommits, listRecentCommitsSchema, searchCommits, searchCommitsSchema, searchDiffContents, searchDiffContentsSchema, } from "./tools/commits.js";
import { getCommitDiff, getCommitDiffSchema, getDiffBetweenBranches, getDiffBetweenBranchesSchema, getWorkingTreeDiff, getWorkingTreeDiffSchema, } from "./tools/diff.js";
import { getBranchStatus, getBranchStatusSchema, listBranches, listBranchesSchema, listTags, listTagsSchema, } from "./tools/status.js";
import { getFileHistory, getFileHistorySchema, blameFile, blameFileSchema, getFileAtRef, getFileAtRefSchema, } from "./tools/fileHistory.js";
import { getContributorStats, getContributorStatsSchema, getFileChurn, getFileChurnSchema, } from "./tools/stats.js";
const repoPath = resolveRepoPath();
const server = new McpServer({
    name: "git-insights-mcp",
    version: "0.1.0",
});
function asText(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function asError(err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
        isError: true,
        content: [{ type: "text", text: `Error: ${message}` }],
    };
}
function register(name, title, description, schema, fn) {
    // ToolCallback<S> is conditional on the generic S, so TS can't verify the
    // callback against it until S is concrete — hence the cast.
    const cb = async (params) => {
        try {
            return asText(await fn(params));
        }
        catch (err) {
            return asError(err);
        }
    };
    server.registerTool(name, { title, description, inputSchema: schema }, cb);
}
register("list_recent_commits", "List recent commits", "Get the most recent commits on a branch, with author, date, and message.", listRecentCommitsSchema, (p) => listRecentCommits(repoPath, p));
register("search_commits", "Search commits", "Search commit messages for a keyword or phrase.", searchCommitsSchema, (p) => searchCommits(repoPath, p));
register("search_diff_contents", "Search diff contents", "Find commits whose diff added or removed a given string (git pickaxe), optionally scoped to one file.", searchDiffContentsSchema, (p) => searchDiffContents(repoPath, p));
register("get_commit_diff", "Get commit diff", "Show the diff and stats for a specific commit hash.", getCommitDiffSchema, (p) => getCommitDiff(repoPath, p));
register("get_diff_between_branches", "Get diff between branches", "Show the diff and change summary between two branches or refs.", getDiffBetweenBranchesSchema, (p) => getDiffBetweenBranches(repoPath, p));
register("get_working_tree_diff", "Get working tree diff", "Show the uncommitted changes in the working tree, split into staged and unstaged diffs.", getWorkingTreeDiffSchema, (p) => getWorkingTreeDiff(repoPath, p));
register("get_branch_status", "Get branch status", "Show current branch, ahead/behind counts, and any uncommitted changes.", getBranchStatusSchema, () => getBranchStatus(repoPath));
register("list_branches", "List branches", "List local (and optionally remote) branches in the repo.", listBranchesSchema, (p) => listBranches(repoPath, p));
register("list_tags", "List tags", "List tags in the repo, newest first.", listTagsSchema, (p) => listTags(repoPath, p));
register("get_file_history", "Get file history", "Get the commit history for a specific file.", getFileHistorySchema, (p) => getFileHistory(repoPath, p));
register("blame_file", "Blame file", "Show line-by-line commit/author attribution for a file (git blame), optionally for a line range.", blameFileSchema, (p) => blameFile(repoPath, p));
register("get_file_at_ref", "Get file at ref", "Read a file's contents as of a given branch, tag, or commit.", getFileAtRefSchema, (p) => getFileAtRef(repoPath, p));
register("get_contributor_stats", "Get contributor stats", "Summarize commit counts per author across the history of a ref.", getContributorStatsSchema, (p) => getContributorStats(repoPath, p));
register("get_file_churn", "Get file churn", "Rank the most frequently changed files (hotspots) over recent history.", getFileChurnSchema, (p) => getFileChurn(repoPath, p));
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`git-insights-mcp running (stdio) against repo: ${repoPath}`);
}
main().catch((err) => {
    console.error("Fatal error starting git-insights-mcp:", err);
    process.exit(1);
});
