import { useEffect, useState } from 'react';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { TimeSplitBar } from '../../components/TimeSplitBar';
import { newValuePerShirt, shirtsToCoverWage, surplusRate, workerResult } from '../../lib/economics';
import { formatDuration, formatXu, mmss } from '../../lib/format';
import { NotHired, useStudentRedirect, useStudentRoom } from '../../state/StudentRoom';
import styles from './RevealPage.module.css';

/** Vòng 2 trên điện thoại: thời gian của bạn bị chia thế nào. */
export function RevealPage() {
  const redirect = useStudentRedirect();
  const { room, me } = useStudentRoom();
  // Chủ xưởng bật "Hiện tên gọi theo Mác" thì mọi điện thoại đổi nhãn theo; sinh viên vẫn tự bật/tắt được
  const [marx, setMarx] = useState(room.show_terms);
  useEffect(() => setMarx(room.show_terms), [room.show_terms]);

  if (redirect) return redirect;
  if (!me.signed) return <NotHired />;
  // public_rooms chỉ trả giá bán và nguyên liệu khi phòng ở Vòng 2
  if (room.price === null || room.material === null) return null;

  const config = { shiftSeconds: room.duration_sec, wage: room.wage, price: room.price, material: room.material };
  const nv = newValuePerShirt(config.price, config.material);
  const shirts = me.shirts;
  const r = workerResult(me.name, shirts, config);
  const T = config.shiftSeconds;
  const cover = r.secondsToCoverWage;
  const greenPct = cover === null ? 100 : (cover / T) * 100;
  const shirtsForSelf = Math.min(shirts, shirtsToCoverWage(config.wage, nv));
  const shirtsForOwner = shirts - shirtsForSelf;
  const ticks = [0, 1, 2, 3].map((i) => mmss((T * i) / 3));

  const greenName = marx ? 'Thời gian lao động tất yếu' : 'Làm cho mình';
  const amberName = marx ? 'Thời gian lao động thặng dư' : 'Làm cho chủ xưởng';

  return (
    <PhoneScreen>
      <div className={`ph-pad ${styles.head}`}>
        <div className={styles.cap}>Vòng 2, {me.name}</div>
        <h1 className={styles.title}>{formatDuration(T)} của bạn đã đi đâu?</h1>
      </div>

      <div className={styles.timecard}>
        <TimeSplitBar
          greenPct={greenPct}
          greenLabel={`${shirtsForSelf} áo`}
          amberLabel={shirtsForOwner > 0 ? `${shirtsForOwner} áo` : undefined}
          ticks={ticks}
          ariaLabel={
            cover === null
              ? 'Cả ca bạn chưa làm ra đủ tiền lương'
              : `Đến ${mmss(cover)} bạn làm đủ tiền lương, thời gian còn lại làm cho chủ xưởng`
          }
        />
        <div className={styles.legend}>
          <div>
            <b className={styles.legendG}>
              <span className="sw" style={{ background: 'var(--leaf)' }} />
              {greenName}
            </b>
            {cover === null
              ? `Cả ca bạn làm ra ${formatXu(r.valueCreated)}, chưa đủ ${config.wage} xu tiền lương.`
              : `0:00 đến ${mmss(cover)}. Bạn đã làm ra đủ ${config.wage} xu tiền lương.`}
          </div>
          {cover !== null && (
            <div>
              <b className={styles.legendA}>
                <span className="sw hatch" />
                {amberName}
              </b>
              {mmss(cover)} đến {mmss(T)}. Mọi thứ bạn làm ra thuộc về chủ.
            </div>
          )}
        </div>
      </div>

      <div className={styles.books}>
        <p className={styles.booksNote}>
          Mỗi áo bán {config.price} xu, nguyên liệu {config.material} xu. Bạn thêm vào {nv} xu mỗi áo.
        </p>
        <LedgerLines
          variant="plain"
          rows={[
            {
              label: `Bạn tạo ra (${shirts} × ${nv})`,
              value: <b className={`${styles.v} num`}>{formatXu(r.valueCreated)}</b>,
            },
            {
              label: 'Bạn nhận',
              value: <b className={`${styles.v} ${styles.green} num`}>{formatXu(r.wage)}</b>,
            },
            {
              label: 'Chủ xưởng giữ',
              value: (
                <b className={`${styles.v} num`} style={{ color: r.surplus >= 0 ? 'var(--amber)' : 'var(--ink2)' }}>
                  {formatXu(r.surplus)}
                </b>
              ),
            },
          ]}
        />
      </div>

      <div className="grow" />

      {marx && (
        <div className={styles.terms}>
          <div className={styles.termRow}>
            <b>Giá trị thặng dư (m)</b>
            <b className={`${styles.termVal} num`} style={{ color: 'var(--amber)' }}>
              {formatXu(r.surplus)}
            </b>
          </div>
          <div className={styles.termRow} style={{ marginTop: 6 }}>
            <span className={styles.muted}>
              Tỷ suất m′ = {r.surplus} ÷ {r.wage}
            </span>
            <b className={`${styles.termVal} num`}>{Math.round(surplusRate(r.surplus, r.wage))}%</b>
          </div>
        </div>
      )}

      <div className={`ph-pad ${styles.foot}`}>
        <button type="button" className="btn" aria-pressed={marx} onClick={() => setMarx(!marx)}>
          {marx ? 'Ẩn tên gọi' : 'Hiện tên gọi theo Mác'}
        </button>
      </div>
    </PhoneScreen>
  );
}
