const { getAIReportDetail } = require('../../../api/admin');

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatAmount(value) {
    return Number(value || 0).toFixed(2);
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inlineMarkdown(text) {
    return String(text || '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="padding:2px 6px;border-radius:6px;background:#f2f5f7;color:#1f2937;">$1</code>');
}

function normalizeMarkdownInput(markdown) {
    let text = String(markdown || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    if (text.startsWith('```')) {
        const lines = text.split('\n');
        lines.shift();
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        if (lines.length && lines[lines.length - 1].trim() === '```') {
            lines.pop();
        }
        text = lines.join('\n').trim();
    }

    const lines = text.split('\n');
    if (lines.length && /^(markdown|md)$/i.test(lines[0].trim())) {
        lines.shift();
        text = lines.join('\n').trim();
    }
    return text;
}

function isTableHeader(line) {
    return /\|/.test(line);
}

function isTableDivider(line) {
    return /^\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

function isTableRow(line) {
    return /\|/.test(line);
}

function splitTableRow(line) {
    let content = line.trim();
    if (content.startsWith('|')) content = content.slice(1);
    if (content.endsWith('|')) content = content.slice(0, -1);
    return content.split('|').map((cell) => cell.trim());
}

function renderTable(headers, rows) {
    const thStyle = 'border:1px solid #e7edf3;padding:8px 10px;text-align:left;background:#f4f8f7;font-size:14px;';
    const tdStyle = 'border:1px solid #e7edf3;padding:8px 10px;text-align:left;font-size:14px;color:#374151;';
    const head = `<tr>${headers.map((h) => `<th style="${thStyle}">${inlineMarkdown(h)}</th>`).join('')}</tr>`;
    const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td style="${tdStyle}">${inlineMarkdown(cell)}</td>`).join('')}</tr>`)
        .join('');
    return `<table style="width:100%;border-collapse:collapse;margin:10px 0 14px;">${head}${body}</table>`;
}

function markdownToHtml(markdown) {
    const normalized = normalizeMarkdownInput(markdown);
    if (!normalized) return '<p style="margin:0;color:#6b7280;">暂无内容</p>';

    const lines = escapeHtml(normalized).split('\n');
    const html = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
        if (inUl) {
            html.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            html.push('</ol>');
            inOl = false;
        }
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();

        if (!line) {
            closeLists();
            continue;
        }

        if (/^```/.test(line)) {
            closeLists();
            const codeLines = [];
            i += 1;
            for (; i < lines.length; i += 1) {
                const codeLine = lines[i];
                if (/^```/.test(codeLine.trim())) break;
                codeLines.push(codeLine);
            }
            html.push(
                `<pre style="white-space:pre-wrap;word-break:break-all;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin:10px 0;color:#1f2937;font-size:13px;line-height:1.7;">${codeLines.join('\n')}</pre>`
            );
            continue;
        }

        if (isTableHeader(line) && i + 1 < lines.length && isTableDivider(lines[i + 1].trim())) {
            closeLists();
            const headers = splitTableRow(line);
            const rows = [];
            i += 2;
            for (; i < lines.length; i += 1) {
                const rowLine = lines[i].trim();
                if (!rowLine) {
                    i -= 1;
                    break;
                }
                if (!isTableRow(rowLine)) {
                    i -= 1;
                    break;
                }
                if (isTableDivider(rowLine)) continue;
                rows.push(splitTableRow(rowLine));
            }
            html.push(renderTable(headers, rows));
            continue;
        }

        if (/^###\s+/.test(line)) {
            closeLists();
            html.push(`<h3 style="margin:12px 0 8px;color:#1f7a4d;font-size:16px;font-weight:700;">${inlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`);
            continue;
        }
        if (/^##\s+/.test(line)) {
            closeLists();
            html.push(`<h2 style="margin:12px 0 8px;color:#1f7a4d;font-size:18px;font-weight:700;">${inlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`);
            continue;
        }
        if (/^#\s+/.test(line)) {
            closeLists();
            html.push(`<h1 style="margin:12px 0 8px;color:#1f7a4d;font-size:20px;font-weight:700;">${inlineMarkdown(line.replace(/^#\s+/, ''))}</h1>`);
            continue;
        }
        if (/^>\s+/.test(line)) {
            closeLists();
            html.push(`<blockquote style="margin:10px 0;padding:10px 14px;border-left:4px solid #b7d8c6;background:#f8fbf9;color:#374151;">${inlineMarkdown(line.replace(/^>\s+/, ''))}</blockquote>`);
            continue;
        }
        if (/^[-*]\s+/.test(line)) {
            if (inOl) {
                html.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                html.push('<ul style="margin:8px 0 10px 18px;color:#374151;">');
                inUl = true;
            }
            html.push(`<li style="line-height:1.9;font-size:14px;">${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`);
            continue;
        }
        if (/^\d+\.\s+/.test(line)) {
            if (inUl) {
                html.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                html.push('<ol style="margin:8px 0 10px 18px;color:#374151;">');
                inOl = true;
            }
            html.push(`<li style="line-height:1.9;font-size:14px;">${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`);
            continue;
        }
        if (/^---+$/.test(line)) {
            closeLists();
            html.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0;" />');
            continue;
        }

        closeLists();
        html.push(`<p style="margin:0 0 10px;color:#374151;line-height:1.9;font-size:14px;">${inlineMarkdown(line)}</p>`);
    }

    closeLists();
    return html.join('');
}

Page({
    data: {
        loading: false,
        report: null,
        reportText: '',
        reportHtml: ''
    },

    onLoad(options) {
        if (!options.id) {
            wx.showToast({ title: '缺少报表ID', icon: 'none' });
            return;
        }
        this.fetchDetail(options.id);
    },

    async fetchDetail(id) {
        this.setData({ loading: true });
        try {
            const resp = await getAIReportDetail(id);
            const reportInfo = resp.report || resp || {};
            const markdown = reportInfo.report_markdown || reportInfo.report || '';
            this.setData({
                report: {
                    ...reportInfo,
                    created_at_text: formatDateTime(reportInfo.created_at),
                    property_paid_amount_text: formatAmount(reportInfo.property_paid_amount)
                },
                reportText: markdown,
                reportHtml: markdownToHtml(markdown)
            });
        } catch (e) {
            console.error(e);
        } finally {
            this.setData({ loading: false });
        }
    }
});
