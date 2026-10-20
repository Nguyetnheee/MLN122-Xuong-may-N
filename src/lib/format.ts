/** Định dạng số kiểu Việt Nam: 4320 → "4.320" */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

/** Số tiền kèm đơn vị, số âm dùng dấu trừ "−": -600 → "− 600 xu" */
export function formatXu(n: number): string {
  return (n < 0 ? '− ' : '') + formatNumber(Math.abs(n)) + ' xu';
}

/** Giây → "m:ss": 65 → "1:05" */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Giây → chữ: 180 → "3 phút", 90 → "1 phút 30 giây" */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} giây`;
  return s === 0 ? `${m} phút` : `${m} phút ${s} giây`;
}
