import type { ReactNode } from 'react';
import styles from './StatTile.module.css';

interface StatTileProps {
  /** amber: phần của chủ xưởng; green: phần của công nhân; outline: ô viền trắng */
  tone: 'amber' | 'green' | 'outline';
  label?: ReactNode;
  value?: ReactNode;
  note?: ReactNode;
  /** Nội dung tự do thay cho label/value/note */
  children?: ReactNode;
}

/** Ô số liệu lớn trên màn "Lật sổ sách". */
export function StatTile({ tone, label, value, note, children }: StatTileProps) {
  return (
    <div className={styles.tile} data-tone={tone}>
      {children ?? (
        <>
          <div className={styles.label}>{label}</div>
          <div className={`${styles.value} num`}>{value}</div>
          {note && <div className={styles.note}>{note}</div>}
        </>
      )}
    </div>
  );
}
