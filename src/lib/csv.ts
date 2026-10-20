import type { ShiftSummary } from './economics';
import { mmss } from './format';

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Bảng tổng kết dạng CSV (có BOM để Excel đọc đúng tiếng Việt). */
export function buildResultsCsv(summary: ShiftSummary): string {
  // Tiền tính bằng xu; "Đủ lương sau" dạng m:ss kể từ đầu ca
  const header = ['Công nhân', 'Số áo', 'Giá trị tạo ra', 'Lương nhận', 'Phần cho chủ', 'Đủ lương sau'];
  const rows = summary.workers.map((w) => [
    w.name,
    w.shirts,
    w.valueCreated,
    w.wage,
    w.surplus,
    w.secondsToCoverWage === null ? 'Chưa đủ' : mmss(w.secondsToCoverWage),
  ]);
  const totals = ['Tổng', summary.totalShirts, summary.totalValueCreated, summary.totalWage, summary.totalSurplus, ''];
  return '﻿' + [header, ...rows, totals].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** Tải một file văn bản về máy người xem. */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
