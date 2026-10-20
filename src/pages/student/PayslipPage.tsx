import { Link } from 'react-router-dom';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { formatDuration } from '../../lib/format';
import { rankByShirts } from '../../lib/game';
import { FACTORY_NAME, MOCK_CLASSMATES, MOCK_PLAYER_NAME, MOCK_PLAYER_SHIRTS, MOCK_ROOM } from '../../lib/mockData';
import { useAppState } from '../../state/AppState';
import styles from './PayslipPage.module.css';

/** Phiếu lương: ai cũng nhận đúng tiền lương hợp đồng, dù may nhiều hay ít. */
export function PayslipPage() {
  const { student, config } = useAppState();
  const name = student.name || MOCK_PLAYER_NAME;
  const room = student.room || MOCK_ROOM;
  const shirts = student.shirts ?? MOCK_PLAYER_SHIRTS;
  const rank = rankByShirts(shirts, MOCK_CLASSMATES.map((w) => w.shirts));
  const classSize = MOCK_CLASSMATES.length + 1;

  return (
    <PhoneScreen tone="ledger">
      <div className={`ph-pad ${styles.head}`}>
        <div className={styles.cap}>Ca 1 đã kết thúc</div>
        <h1 className={styles.title}>Phiếu lương của bạn</h1>
      </div>

      <div className={styles.slip}>
        <div className={styles.slipHead}>
          <span>{FACTORY_NAME}</span>
          <span>Phòng {room}</span>
        </div>
        <LedgerLines
          rows={[
            { label: 'Công nhân', value: name },
            { label: 'Thời gian làm', value: formatDuration(config.shiftSeconds) },
            { label: 'Số áo đã may', value: <span className="num">{shirts} chiếc</span> },
            { label: 'Lương theo hợp đồng', value: <span className="num">{config.wage} xu</span> },
          ]}
        />
        <div className={styles.perf} aria-hidden="true" />
        <div className={styles.total}>
          <b>Thực nhận</b>
          <span className={`${styles.amount} num`}>{config.wage} xu</span>
        </div>
      </div>

      <div className={styles.rank}>
        <span>Xếp hạng số áo</span>
        <b className="num">
          {rank} / {classSize}
        </b>
      </div>

      <div className="grow" />

      <div className={`ph-pad ${styles.foot}`}>
        <p className={styles.look}>Nhìn lên máy chiếu. Chủ xưởng sắp mở sổ sách của ca vừa rồi.</p>
        <Link to="/lat-bai" className="btn ghost">
          Bản thử: sang Vòng 2
        </Link>
      </div>
    </PhoneScreen>
  );
}
