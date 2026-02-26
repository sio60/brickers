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

    // 마크다운 테이블 → HTML 테이블 (향상된 버전)
    html = html.replace(
        /(?:<br\/?>|^)\|(.+?)\|(?:<br\/?>)\|[-|\s:|]+\|(?:<br\/?>)((?:\|.+?\|(?:<br\/?>)?)+)/gm,
        (_m, header, body) => {
            const ths = header
                .split('|')
                .map((h: string) => h.trim())
                .filter((v: string, i: number, arr: string[]) => !(i === 0 && v === "") && !(i === arr.length - 1 && v === ""))
                .map(
                    (h: string) =>
                        `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:800;font-size:13px;background:#f9fafb;color:#374151">${h || '&nbsp;'}</th>`
                )
                .join('');

            const rows = body
                .split(/<br\/?>/)
                .map((r: string) => r.trim())
                .filter(Boolean)
                .map((row: string) => {
                    const tds = row
                        .split('|')
                        .map((c: string) => c.trim())
                        .filter((v: string, i: number, arr: string[]) => !(i === 0 && v === "") && !(i === arr.length - 1 && v === ""))
                        .map(
                            (c: string) =>
                                `<td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#4b5563;white-space:pre-wrap">${c || '&nbsp;'}</td>`
                        )
                        .join('');
                    return `<tr style="background:white hover:bg-gray-50 transition-colors">${tds}</tr>`;
                })
                .join('');

            return `<div style="overflow-x:auto;margin:20px 0;border:1px solid #e5e7eb;border-radius:12px shadow-sm"><table style="width:100%;border-collapse:collapse;background:white"><thead><tr>${ths}</tr></thead><tbody style="border-top:1px solid #e5e7eb">${rows}</tbody></table></div>`;
        }
    );

    return html;
}
