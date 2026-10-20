import type { ReactNode } from 'react';
import styles from './PhoneScreen.module.css';

interface PhoneScreenProps {
  children: ReactNode;
  /** Nền của màn: trắng (mặc định) hoặc xanh nhạt kiểu sổ (phiếu lương) */
  tone?: 'paper' | 'ledger';
}

/**
 * Khung trang sinh viên. Trên điện thoại chiếm trọn màn hình (không có viền điện thoại như file mẫu);
 * trên màn rộng hơn 480px thì căn giữa, rộng tối đa 430px.
 */
export function PhoneScreen({ children, tone = 'paper' }: PhoneScreenProps) {
  return (
    <div className={styles.outer}>
      <main className={styles.screen} data-tone={tone}>
        {children}
      </main>
    </div>
  );
}
