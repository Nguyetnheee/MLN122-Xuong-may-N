import { useEffect, useState } from 'react';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { listPlayers } from '../../lib/api';
import { formatDuration } from '../../lib/format';
import { rankByShirts } from '../../lib/game';
import { FACTORY_NAME } from '../../lib/mockData';
import { NotHired, useStudentRedirect, useStudentRoom } from '../../state/StudentRoom';
import styles from './PayslipPage.module.css';

/** Phiếu lương: ai cũng nhận đúng tiền lương hợp đồng, dù may nhiều hay ít. */
export function PayslipPage() {
  const redirect = useStudentRedirect();
  const { room, me, refreshMe } = useStudentRoom();
  const [others, setOthers] = useState<number[] | null>(null);

  // Đọc số áo cuối cùng và cả lớp để xếp hạng. Đọc lại sau 2 giây cho chắc
  // (vài chiếc áo cuối ca có thể vẫn đang trên đường tới server).
  useEffect(() => {
    const load = () => {
      refreshMe();
      listPlayers(room.id)
        .then((list) => setOthers(list.filter((p) => p.signed && p.id !== me.id).map((p) => p.shirts)))
        .catch(() => {});
    };
    load();
    const t = window.setTimeout(load, 2000);
    return () => window.clearTimeout(t);
    // Chỉ chạy một lần khi mở màn
  }, [room.id]);

  if (redirect) return redirect;
  if (!me.signed) return <NotHired />;

  return (
    <PhoneScreen tone="ledger">
      <div className={`ph-pad ${styles.head}`}>
        <div className={styles.cap}>Ca làm đã kết thúc</div>
        <h1 className={styles.title}>Phiếu lương của bạn</h1>
      </div>

      <div className={styles.slip}>
        <div className={styles.slipHead}>
          <span>{FACTORY_NAME}</span>
          <span>Phòng {room.code}</span>
        </div>
        <LedgerLines
          rows={[
            { label: 'Công nhân', value: me.name },
            { label: 'Thời gian làm', value: formatDuration(room.duration_sec) },
            { label: 'Số áo đã may', value: <span className="num">{me.shirts} chiếc</span> },
            { label: 'Lương theo hợp đồng', value: <span className="num">{room.wage} xu</span> },
          ]}
        />
        <div className={styles.perf} aria-hidden="true" />
        <div className={styles.total}>
          <b>Thực nhận</b>
          <span className={`${styles.amount} num`}>{room.wage} xu</span>
        </div>
      </div>

      <div className={styles.rank}>
        <span>Xếp hạng số áo</span>
        <b className="num">{others ? `${rankByShirts(me.shirts, others)} / ${others.length + 1}` : '…'}</b>
      </div>

      <div className="grow" />

      <div className={`ph-pad ${styles.foot}`}>
        <p className={styles.look}>Nhìn lên máy chiếu. Chủ xưởng sắp mở sổ sách của ca vừa rồi.</p>
      </div>
    </PhoneScreen>
  );
}
