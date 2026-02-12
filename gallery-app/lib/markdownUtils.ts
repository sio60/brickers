/**
 * 간단한 마크다운 → HTML 변환 유틸리티.
 * react-markdown 없이 기본적인 마크다운을 렌더링합니다.
 * 여러 컴포넌트에서 import해서 사용 가능.
 */
export function renderMarkdown(md: string): string {
    let html = md
        // ### H3
        .replace(/^### (.+)$/gm, '<h4 style="font-size:14px;font-weight:800;margin:14px 0 6px;color:#000">$1</h4>')
        // ## H2
        .replace(/^## (.+)$/gm, '<h3 style="font-size:16px;font-weight:900;margin:18px 0 8px;color:#000">$1</h3>')
        // # H1
        .replace(/^# (.+)$/gm, '<h2 style="font-size:18px;font-weight:900;margin:20px 0 10px;color:#000">$1</h2>')
        // **bold**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // > blockquote
        .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #ddd;padding-left:12px;color:#666;margin:8px 0">$1</blockquote>')
        // - list item
        .replace(/^- (.+)$/gm, '<div style="padding-left:16px;margin:2px 0">• $1</div>')
        // --- hr
        .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>')
        // newline
        .replace(/\n/g, '<br/>');

    // 마크다운 테이블 → HTML 테이블
    html = html.replace(
        /(<br\/?>)?\|(.+?)\|(<br\/?>)\|[-|\s]+\|(<br\/?>)((?:\|.+?\|(?:<br\/?>)?)+)/g,
        (_m, _b1, header, _b2, _sep, body) => {
            const ths = header
                .split('|')
                .filter(Boolean)
                .map(
                    (h: string) =>
                        `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #000;font-weight:800;font-size:12px;background:#f8f9fa">${h.trim()}</th>`
                )
                .join('');
            const rows = body
                .replace(/<br\/?>/g, '\n')
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((row: string) => {
                    const tds = row
                        .split('|')
                        .filter(Boolean)
                        .map(
                            (c: string) =>
                                `<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px">${c.trim()}</td>`
                        )
                        .join('');
                    return `<tr>${tds}</tr>`;
                })
                .join('');
            return `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #eee;border-radius:8px;overflow:hidden"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
        }
    );

    return html;
}
