import { z } from "zod";
import { getGit, assertPathInsideRepo } from "../git.js";

export const getFileHistorySchema = {
  filePath: z.string().min(1).describe("Path to the file, relative to the repo root"),
  count: z.number().min(1).max(100).default(20).describe("Max number of commits to return"),
};

export async function getFileHistory(
  repoPath: string,
  params: { filePath: string; count?: number }
) {
  assertPathInsideRepo(repoPath, params.filePath);
  const git = getGit(repoPath);

  const log = await git.log({
    file: params.filePath,
    maxCount: params.count ?? 20,
  });

  return log.all.map((c) => ({
    hash: c.hash.slice(0, 7),
    author: c.author_name,
    date: c.date,
    message: c.message,
  }));
}

export const blameFileSchema = {
  filePath: z.string().min(1).describe("Path to the file, relative to the repo root"),
};

export async function blameFile(repoPath: string, params: { filePath: string }) {
  assertPathInsideRepo(repoPath, params.filePath);
  const git = getGit(repoPath);

  // simple-git doesn't have a typed blame helper, so use raw()
  const raw = await git.raw(["blame", "--line-porcelain", params.filePath]);

  // Parse the porcelain format into compact per-line entries
  const lines = raw.split("\n");
  const entries: { hash: string; author: string; line: string }[] = [];
  let currentHash = "";
  let currentAuthor = "";

  for (const line of lines) {
    if (/^[0-9a-f]{40}/.test(line)) {
      currentHash = line.split(" ")[0].slice(0, 7);
    } else if (line.startsWith("author ")) {
      currentAuthor = line.replace("author ", "");
    } else if (line.startsWith("\t")) {
      entries.push({ hash: currentHash, author: currentAuthor, line: line.slice(1) });
    }
  }

  return { filePath: params.filePath, lineCount: entries.length, blame: entries };
}
