#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveRepoPath } from "./git.js";
import {
  listRecentCommits,
  listRecentCommitsSchema,
  searchCommits,
  searchCommitsSchema,
} from "./tools/commits.js";
import {
  getCommitDiff,
  getCommitDiffSchema,
  getDiffBetweenBranches,
  getDiffBetweenBranchesSchema,
} from "./tools/diff.js";
import {
  getBranchStatus,
  getBranchStatusSchema,
  listBranches,
  listBranchesSchema,
} from "./tools/status.js";
import {
  getFileHistory,
  getFileHistorySchema,
  blameFile,
  blameFileSchema,
} from "./tools/fileHistory.js";

const repoPath = resolveRepoPath();

const server = new McpServer({
  name: "git-insights-mcp",
  version: "0.1.0",
});

function asText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function asError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}

server.registerTool(
  "list_recent_commits",
  {
    title: "List recent commits",
    description:
      "Get the most recent commits on a branch, with author, date, and message.",
    inputSchema: listRecentCommitsSchema,
  },
  async (params) => {
    try {
      return asText(await listRecentCommits(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "search_commits",
  {
    title: "Search commits",
    description: "Search commit messages for a keyword or phrase.",
    inputSchema: searchCommitsSchema,
  },
  async (params) => {
    try {
      return asText(await searchCommits(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "get_commit_diff",
  {
    title: "Get commit diff",
    description: "Show the diff and stats for a specific commit hash.",
    inputSchema: getCommitDiffSchema,
  },
  async (params) => {
    try {
      return asText(await getCommitDiff(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "get_diff_between_branches",
  {
    title: "Get diff between branches",
    description:
      "Show the diff and change summary between two branches or refs.",
    inputSchema: getDiffBetweenBranchesSchema,
  },
  async (params) => {
    try {
      return asText(await getDiffBetweenBranches(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "get_branch_status",
  {
    title: "Get branch status",
    description:
      "Show current branch, ahead/behind counts, and any uncommitted changes.",
    inputSchema: getBranchStatusSchema,
  },
  async () => {
    try {
      return asText(await getBranchStatus(repoPath));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "list_branches",
  {
    title: "List branches",
    description: "List local (and optionally remote) branches in the repo.",
    inputSchema: listBranchesSchema,
  },
  async (params) => {
    try {
      return asText(await listBranches(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "get_file_history",
  {
    title: "Get file history",
    description: "Get the commit history for a specific file.",
    inputSchema: getFileHistorySchema,
  },
  async (params) => {
    try {
      return asText(await getFileHistory(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

server.registerTool(
  "blame_file",
  {
    title: "Blame file",
    description:
      "Show line-by-line commit/author attribution for a file (git blame).",
    inputSchema: blameFileSchema,
  },
  async (params) => {
    try {
      return asText(await blameFile(repoPath, params));
    } catch (err) {
      return asError(err);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`git-insights-mcp running (stdio) against repo: ${repoPath}`);
}

main().catch((err) => {
  console.error("Fatal error starting git-insights-mcp:", err);
  process.exit(1);
});
// C:\My Data\Office projects\modforge
