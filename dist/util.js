/** Cap applied to potentially large text output (diffs, file contents) so
 * responses stay manageable for the LLM client. */
export const MAX_OUTPUT_CHARS = 15_000;
export function truncate(text, maxLen = MAX_OUTPUT_CHARS) {
    if (text.length <= maxLen)
        return text;
    return text.slice(0, maxLen) + `\n\n... [truncated, ${text.length - maxLen} more characters]`;
}
