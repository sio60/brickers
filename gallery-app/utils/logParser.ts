
/**
 * Agent Log Parser
 *
 * @param log - Raw log string from SSE
 * @param t - i18n translation function (e.g. from useLanguage())
 * @returns Localized message string or original log if parsing fails
 */
export function parseAgentLog(log: string, t: any): string {
    if (!log) return "";

    // 1. [STEP] Format Parsing (e.g. [brickify] ...)
    const matchBracket = log.match(/^\[(.+?)\]\s*/);
    if (matchBracket) {
        const step = matchBracket[1];
        // Check if translation exists in sse.[step]
        if (step && t.sse && t.sse[step]) {
            return t.sse[step];
        }
        // If no translation, strip the bracket and return the rest
        return log.replace(/^\[.*?\]\s*/, '');
    }

    // 2. Trace: node_name (STATUS) Format Parsing
    // e.g. "Trace: node_merger (SUCCESS)"
    const matchTrace = log.match(/^Trace:\s*(\w+)\s*\((.+?)\)/);
    if (matchTrace) {
        const node = matchTrace[1];
        // Check if translation exists in sse.trace.[node]
        if (node && t.sse && t.sse.trace && t.sse.trace[node]) {
            return t.sse.trace[node];
        }
        // Fallback: Return node name with status if no translation
        return `${node} (${matchTrace[2]})`;
    }

    // Default: Return original log
    return log;
}
