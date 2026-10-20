import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { formatDuration } from '../../lib/format';
import { FACTORY_NAME, MOCK_PLAYER_NAME, MOCK_ROOM } from '../../lib/mockData';
import { useAppState } from '../../state/AppState';
import styles from './ContractPage.module.css';

/** Hợp đồng lao động. Sinh viên chỉ thấy lương và thời gian; giá áo và nguyên liệu bị giấu. */
export function ContractPage() {
  const { student, updateStudent, config } = useAppState();
  const [agree, setAgree] = useState(false);
  const room = student.room || MOCK_ROOM;
  const name = student.name || MOCK_PLAYER_NAME;

  return (
    <PhoneScreen>
      <div className={`ph-pad ${styles.room}`}>Phòng {room}</div>

      <div className={styles.contract}>
        <h1 className={styles.title}>Hợp đồng lao động</h1>
        <p className={styles.sub}>Số {room}/HĐ, ca làm hôm nay</p>
        <LedgerLines
          rows={[
            { label: 'Bên thuê', value: FACTORY_NAME },
            { label: 'Người lao động', value: name },
            { label: 'Công việc', value: 'May áo' },
            { label: 'Thời gian', value: `1 ca, ${formatDuration(config.shiftSeconds)}` },
            { label: 'Nguyên liệu', value: 'Xưởng cung cấp' },
            { label: 'Lương cả ca', value: <span className={`${styles.wage} num`}>{config.wage} xu</span>, tall: true },
          ]}
        />
        <p className={styles.note}>Lương trả đủ khi hết ca, không phụ thuộc số áo may được.</p>
        {student.signed && (
          <div className={styles.stamp} aria-hidden="true">
            Đã ký
          </div>
        )}
      </div>

      <div className="grow" />

      {student.signed ? (
        <div className={`ph-pad ${styles.foot}`}>
          <div className="status" role="status">
            <span className="dot" />
            <div>
              <b>Đã ký. Chờ chủ xưởng bắt đầu ca</b>
              <div className={styles.hint}>Màn hình sẽ tự chuyển khi ca bắt đầu.</div>
            </div>
          </div>
          <Link to="/may-ao" className="btn ghost">
            Bản thử: sang màn hình may áo
          </Link>
        </div>
      ) : (
        <div className={`ph-pad ${styles.foot}`}>
          <label className={`check ${styles.agree}`} htmlFor="agree">
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Tôi đã đọc và đồng ý với hợp đồng
          </label>
          <button type="button" className="btn" disabled={!agree} onClick={() => updateStudent({ signed: true })}>
            Ký hợp đồng
          </button>
        </div>
      )}
    </PhoneScreen>
  );
}
