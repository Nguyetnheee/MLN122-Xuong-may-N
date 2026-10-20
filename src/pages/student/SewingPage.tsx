import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneScreen } from '../../components/PhoneScreen';
import { ShirtIcon, ShirtPartIcon } from '../../components/ShirtIcon';
import { mmss } from '../../lib/format';
import { PART_NAMES, SHIRT_PARTS, shuffledParts, type ShirtPart } from '../../lib/game';
import { useAppState } from '../../state/AppState';
import styles from './SewingPage.module.css';

type Phase = 'idle' | 'work' | 'done';

/** Số áo nhỏ tối đa vẽ ra phía trên, tránh tràn màn hình */
const MAX_SHIRT_ICONS = 30;

/**
 * Màn chơi may áo (chạy cục bộ). Bấm đúng 4 bước theo thứ tự = 1 áo;
 * bấm sai thì làm lại chiếc đó từ bước 1. Không hiện giá trị tiền của áo.
 */
export function SewingPage() {
  const { config, updateStudent } = useAppState();
  const navigate = useNavigate();
  const total = config.shiftSeconds;

  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(total);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<ShirtPart[]>(() => shuffledParts());
  /** 0 = không có cảnh báo; mỗi lần bấm sai tăng lên để chạy lại hiệu ứng rung */
  const [wrongKey, setWrongKey] = useState(0);
  const endAt = useRef(0);

  // Đếm ngược theo đồng hồ thật để không bị lệch khi tab bị chậm
  useEffect(() => {
    if (phase !== 'work') return;
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) setPhase('done');
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') updateStudent({ shirts: count });
  }, [phase, count, updateStudent]);

  function start() {
    endAt.current = Date.now() + total * 1000;
    setLeft(total);
    setCount(0);
    setStep(0);
    setOrder(shuffledParts());
    setWrongKey(0);
    setPhase('work');
  }

  function finishNow() {
    setLeft(0);
    setPhase('done');
  }

  function press(part: ShirtPart) {
    if (phase !== 'work') return;
    if (order[step] === part) {
      setWrongKey(0);
      if (step === order.length - 1) {
        setCount((c) => c + 1);
        setStep(0);
        setOrder(shuffledParts());
      } else {
        setStep(step + 1);
      }
    } else {
      setStep(0);
      setWrongKey((k) => k + 1);
    }
  }

  return (
    <PhoneScreen>
      <div className={`ph-pad ${styles.top}`}>
        <div>
          <div className={styles.cap}>Còn lại</div>
          <div className={`${styles.big} num`}>{mmss(left)}</div>
        </div>
        <div className={styles.right}>
          <div className={styles.cap}>Áo đã may</div>
          <div className={`${styles.big} ${styles.count} num`} role="status">
            {count}
          </div>
        </div>
      </div>

      <div className={styles.bar} aria-hidden="true">
        <i style={{ width: `${(left / total) * 100}%` }} />
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
        {wrongKey > 0 && (
          <p key={wrongKey} className={`warn shake ${styles.wrong}`} role="alert">
            Sai thứ tự. Làm lại chiếc áo này từ bước 1.
          </p>
        )}
      </div>

      <div className="grow" />

      {phase === 'idle' && (
        <div className={`ph-pad ${styles.stack}`}>
          <p className={styles.hint}>Trong buổi học, ca bắt đầu khi chủ xưởng bấm nút. Ở bản thử, bạn tự bắt đầu.</p>
          <button type="button" className="btn" onClick={start}>
            Bắt đầu ca
          </button>
        </div>
      )}

      {phase === 'work' && (
        <div className={styles.work}>
          <div className={styles.pads}>
            {SHIRT_PARTS.map((part) => (
              <button key={part} type="button" className={styles.pad} onClick={() => press(part)}>
                <ShirtPartIcon part={part} />
                {PART_NAMES[part]}
              </button>
            ))}
          </div>
          <div className={styles.finish}>
            <button type="button" className="linkbtn" onClick={finishNow}>
              Bản thử: kết thúc ca ngay
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className={`ph-pad ${styles.stack}`}>
          <div className="status" role="status">
            <b>Hết ca. Bạn đã may {count} chiếc áo.</b>
          </div>
          <button type="button" className="btn" onClick={() => navigate('/phieu-luong')}>
            Nhận lương
          </button>
        </div>
      )}
    </PhoneScreen>
  );
}
