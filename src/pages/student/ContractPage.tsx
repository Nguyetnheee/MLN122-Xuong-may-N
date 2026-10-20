import { useState } from 'react';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { signContract } from '../../lib/api';
import { formatDuration } from '../../lib/format';
import { FACTORY_NAME } from '../../lib/mockData';
import { useStudentRedirect, useStudentRoom } from '../../state/StudentRoom';
import styles from './ContractPage.module.css';

/** Hợp đồng lao động. Sinh viên chỉ thấy lương và thời gian; giá áo và nguyên liệu bị giấu. */
export function ContractPage() {
  const redirect = useStudentRedirect();
  const { room, me, credentials, refreshMe } = useStudentRoom();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      await signContract(credentials);
      await refreshMe();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (redirect) return redirect;

  return (
    <PhoneScreen>
      <div className={`ph-pad ${styles.room}`}>Phòng {room.code}</div>

      <div className={styles.contract}>
        <h1 className={styles.title}>Hợp đồng lao động</h1>
        <p className={styles.sub}>Số {room.code}/HĐ, ca làm hôm nay</p>
        <LedgerLines
          rows={[
            { label: 'Bên thuê', value: FACTORY_NAME },
            { label: 'Người lao động', value: me.name },
            { label: 'Công việc', value: 'May áo' },
            { label: 'Thời gian', value: `1 ca, ${formatDuration(room.duration_sec)}` },
            { label: 'Nguyên liệu', value: 'Xưởng cung cấp' },
            { label: 'Lương cả ca', value: <span className={`${styles.wage} num`}>{room.wage} xu</span>, tall: true },
          ]}
        />
        <p className={styles.note}>Lương trả đủ khi hết ca, không phụ thuộc số áo may được.</p>
        {me.signed && (
          <div className={styles.stamp} aria-hidden="true">
            Đã ký
          </div>
        )}
      </div>

      <div className="grow" />

      {me.signed ? (
        <div className={`ph-pad ${styles.foot}`}>
          <div className="status" role="status">
            <span className="dot" />
            <div>
              <b>Đã ký. Chờ chủ xưởng bắt đầu ca</b>
              <div className={styles.hint}>Màn hình sẽ tự chuyển khi ca bắt đầu.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`ph-pad ${styles.foot}`}>
          <label className={`check ${styles.agree}`} htmlFor="agree">
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Tôi đã đọc và đồng ý với hợp đồng
          </label>
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn" disabled={!agree || busy} onClick={sign}>
            {busy ? 'Đang ký…' : 'Ký hợp đồng'}
          </button>
        </div>
      )}
    </PhoneScreen>
  );
}
