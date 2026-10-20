import type { ReactNode } from 'react';
import styles from './TimeSplitBar.module.css';

interface TimeSplitBarProps {
  /** Tỷ lệ phần xanh "làm cho mình", 0–100 (%) */
  greenPct: number;
  greenLabel?: ReactNode;
  amberLabel?: ReactNode;
  /** Mốc thời gian phía trên thanh, ví dụ ["0:00", "1:00", "2:00", "3:00"] */
  ticks?: string[];
  ariaLabel: string;
}

/** Thanh thời gian chia hai phần: xanh = làm cho mình, cam sọc = làm cho chủ xưởng. */
export function TimeSplitBar({ greenPct, greenLabel, amberLabel, ticks, ariaLabel }: TimeSplitBarProps) {
  const g = Math.min(100, Math.max(0, greenPct));
  return (
    <div>
      {ticks && (
        <div className={`${styles.ticks} num`} aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
      <div className={styles.split} role="img" aria-label={ariaLabel}>
        {g > 0 && (
          <div className={styles.g} style={{ width: `${g}%` }}>
            {greenLabel}
          </div>
        )}
        {g < 100 && (
          <div className={`${styles.a} hatch`} style={{ width: `${100 - g}%` }}>
            {amberLabel}
          </div>
        )}
      </div>
    </div>
  );
}
