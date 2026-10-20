import type { ReactNode } from 'react';
import styles from './LedgerLines.module.css';

export interface LedgerRow {
  label: ReactNode;
  value: ReactNode;
  /** Dòng cao hơn, dùng cho con số chính (ví dụ lương cả ca) */
  tall?: boolean;
}

interface LedgerLinesProps {
  rows: LedgerRow[];
  /**
   * form: nhãn xám nhỏ, giá trị đậm vừa (hợp đồng, phiếu lương).
   * plain: nhãn chữ thường, giá trị do trang tự định dạng (sổ sách, lật bài).
   */
  variant?: 'form' | 'plain';
}

/** Các dòng kẻ ngang kiểu sổ lương: nhãn bên trái, số bên phải. */
export function LedgerLines({ rows, variant = 'form' }: LedgerLinesProps) {
  return (
    <div className={styles.lines} data-variant={variant}>
      {rows.map((r, i) => (
        <div key={i} className={styles.line} data-tall={r.tall || undefined}>
          <span className={styles.k}>{r.label}</span>
          <span className={styles.v}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
