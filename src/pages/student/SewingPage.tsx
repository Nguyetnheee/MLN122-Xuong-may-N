import { useRef, useState } from 'react';
import { PhoneScreen } from '../../components/PhoneScreen';
import { ShirtIcon, ShirtPartIcon } from '../../components/ShirtIcon';
import { makeShirt } from '../../lib/api';
import { mmss } from '../../lib/format';
import { PART_NAMES, SHIRT_PARTS, shuffledParts, type ShirtPart } from '../../lib/game';
import { useCountdown } from '../../lib/useServerClock';
import { NotHired, useStudentRedirect, useStudentRoom } from '../../state/StudentRoom';
import styles from './SewingPage.module.css';

/** Số áo nhỏ tối đa vẽ ra phía trên, tránh tràn màn hình */
const MAX_SHIRT_ICONS = 30;

/**
 * Màn chơi may áo. Bấm đúng 4 bước theo thứ tự = 1 áo, gửi lên server (make_shirt);
 * bấm sai thì làm lại chiếc đó từ bước 1. Không hiện giá trị tiền của áo.
 */
export function SewingPage() {
  const redirect = useStudentRedirect();
  const { room, me, credentials } = useStudentRoom();
  const total = room.duration_sec;
  const left = useCountdown(room.ends_at);
  const working = left !== null && left > 0;

  /** Số áo server đã ghi nhận */
  const [confirmed, setConfirmed] = useState(me.shirts);
  const confirmedRef = useRef(me.shirts);
  /** Số áo đã gửi nhưng server chưa trả lời */
  const [pending, setPending] = useState(0);
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<ShirtPart[]>(() => shuffledParts());
  /** Cảnh báo; mỗi lần đổi key thì chạy lại hiệu ứng rung */
  const [warning, setWarning] = useState<{ key: number; text: string } | null>(null);
  const count = confirmed + pending;

  function warn(text: string) {
    setWarning((w) => ({ key: (w?.key ?? 0) + 1, text }));
  }

  function sendShirt() {
    setPending((p) => p + 1);
    makeShirt(credentials)
      .then((n) => {
        // Server trả số áo hiện tại; nếu không tăng nghĩa là chiếc này không được tính
        if (n <= confirmedRef.current) warn('Chiếc áo vừa rồi không được tính: bấm chậm lại một chút.');
        confirmedRef.current = Math.max(confirmedRef.current, n);
        setConfirmed(confirmedRef.current);
      })
      .catch(() => warn('Mất kết nối, chiếc áo vừa rồi chưa được tính.'))
      .finally(() => setPending((p) => p - 1));
  }

  function press(part: ShirtPart) {
    if (!working) return;
    if (order[step] === part) {
      setWarning(null);
      if (step === order.length - 1) {
        sendShirt();
        setStep(0);
        setOrder(shuffledParts());
      } else {
        setStep(step + 1);
      }
    } else {
      setStep(0);
      warn('Sai thứ tự. Làm lại chiếc áo này từ bước 1.');
    }
  }

  if (redirect) return redirect;
  if (!me.signed) return <NotHired />;

  const shown = left ?? total;

  return (
    <PhoneScreen>
      <div className={`ph-pad ${styles.top}`}>
        <div>
          <div className={styles.cap}>Còn lại</div>
          <div className={`${styles.big} num`}>{mmss(shown)}</div>
        </div>
        <div className={styles.right}>
          <div className={styles.cap}>Áo đã may</div>
          <div className={`${styles.big} ${styles.count} num`} role="status">
            {count}
          </div>
        </div>
      </div>

      <div className={styles.bar} aria-hidden="true">
        <i style={{ width: `${(shown / total) * 100}%` }} />
      </div>

      <div className={styles.shirts} aria-hidden="true">
        {Array.from({ length: Math.min(count, MAX_SHIRT_ICONS) }, (_, i) => (
          <ShirtIcon key={i} size={20} variant="filled" />
        ))}
      </div>

      <div className={styles.seqBox}>
        <div className={styles.seqTitle}>Bấm theo đúng thứ tự này</div>
        <ol className={styles.seq}>
          {order.map((part, i) => (
            <li key={i} className={i < step ? styles.done : i === step ? styles.next : undefined}>
              <small>Bước {i + 1}</small>
              {PART_NAMES[part]}
            </li>
          ))}
        </ol>
        {warning && (
          <p key={warning.key} className={`warn shake ${styles.wrong}`} role="alert">
            {warning.text}
          </p>
        )}
      </div>

      <div className="grow" />

      {working ? (
        <div className={styles.work}>
          <div className={styles.pads}>
            {SHIRT_PARTS.map((part) => (
              <button key={part} type="button" className={styles.pad} onClick={() => press(part)}>
                <ShirtPartIcon part={part} />
                {PART_NAMES[part]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`ph-pad ${styles.stack}`}>
          <div className="status" role="status">
            <b>Hết ca. Bạn đã may {count} chiếc áo.</b>
          </div>
          <p className={styles.hint}>Chờ chủ xưởng phát phiếu lương, màn hình sẽ tự chuyển.</p>
        </div>
      )}
    </PhoneScreen>
  );
}
