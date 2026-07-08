/** Compact commit shape returned by the history/search tools. */
export function toCommitSummary(c: {
  hash: string;
  author_name: string;
  date: string;
  message: string;
}) {
  return {
    hash: c.hash.slice(0, 7),
    author: c.author_name,
    date: c.date,
    message: c.message,
  };
}
