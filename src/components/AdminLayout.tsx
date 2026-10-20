import type { ReactNode } from 'react';
import { FACTORY_NAME } from '../lib/mockData';
import { ShirtIcon } from './ShirtIcon';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  /** Nhãn nhỏ cạnh tên xưởng, ví dụ "Phòng chờ" */
  chip: string;
  /** Các nút bên phải header */
  actions?: ReactNode;
  children: ReactNode;
}

/** Khung các trang chủ xưởng: header kẻ đáy, nội dung trải rộng tối đa 1240px. */
export function AdminLayout({ chip, actions, children }: AdminLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.brand}>
          <ShirtIcon size={28} className={styles.logo} />
          <b>{FACTORY_NAME}</b>
          <span className="chip">{chip}</span>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
