import { useState } from 'react';
import { LedgerLines } from '../../components/LedgerLines';
import { PhoneScreen } from '../../components/PhoneScreen';
import { TimeSplitBar } from '../../components/TimeSplitBar';
import { newValuePerShirt, shirtsToCoverWage, surplusRate, workerResult } from '../../lib/economics';
import { formatXu, mmss } from '../../lib/format';
import { MOCK_PLAYER_NAME, MOCK_PLAYER_SHIRTS } from '../../lib/mockData';
import { useAppState } from '../../state/AppState';
import styles from './RevealPage.module.css';

/** Vòng 2 trên điện thoại: 3 phút của bạn bị chia thế nào. */
export function RevealPage() {
  const { student, config } = useAppState();
  const [marx, setMarx] = useState(false);
  const name = student.name || MOCK_PLAYER_NAME;
  const shirts = student.shirts ?? MOCK_PLAYER_SHIRTS;

  const nv = newValuePerShirt(config.price, config.material);
  const r = workerResult(name, shirts, config);
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
        <div className={styles.cap}>Vòng 2, {name}</div>
        <h1 className={styles.title}>3 phút của bạn đã đi đâu?</h1>
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
