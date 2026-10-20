import type { ReactNode } from 'react';
import styles from './CenterMessage.module.css';

/** Màn thông báo giữa trang: đang tải, lỗi cấu hình, lỗi kết nối. */
export function CenterMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.box} role="status">
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
