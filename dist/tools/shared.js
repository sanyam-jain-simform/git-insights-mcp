/** Compact commit shape returned by the history/search tools. */
export function toCommitSummary(c) {
    return {
        hash: c.hash.slice(0, 7),
        author: c.author_name,
        date: c.date,
        message: c.message,
    };
}
