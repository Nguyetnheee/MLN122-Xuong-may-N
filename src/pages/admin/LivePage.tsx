import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { LedgerLines } from '../../components/LedgerLines';
import { endShift, roomToConfig, setStatus } from '../../lib/api';
import { summarizeShift } from '../../lib/economics';
import { formatNumber, formatXu, mmss } from '../../lib/format';
import { useCountdown } from '../../lib/useServerClock';
import { useOwnerRoom, usePlayers, useStatusRedirect, useStoredFlag } from '../../state/OwnerRoom';
import styles from './LivePage.module.css';

/**
 * Đang chạy ca: đồng hồ theo ends_at (giờ server), tổng áo và top 10 cập nhật realtime.
 * Bật "Chế độ chiếu" trước khi chia sẻ màn hình để ẩn sổ sách.
 */
export function LivePage() {
  const redirect = useStatusRedirect(['playing', 'ended']);
  const { room, refresh } = useOwnerRoom();
  const { players } = usePlayers(room.id);
  const navigate = useNavigate();
  const [projector, setProjector] = useStoredFlag('ca-lam:che-do-chieu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playing = room.status === 'playing';
  const left = useCountdown(playing ? room.ends_at : null);
  const config = roomToConfig(room);

  // Hết giờ thì tự kết thúc ca (một lần)
  const autoEnded = useRef(false);
  useEffect(() => {
    if (!playing || left !== 0 || autoEnded.current) return;
    autoEnded.current = true;
    endShift(room.id)
      .then(refresh)
      .catch((e: Error) => {
        autoEnded.current = false;
        setError(e.message);
      });
  }, [playing, left, room.id, refresh]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const endNow = () =>
    run(async () => {
      await endShift(room.id);
      await refresh();
    });

  const toReveal = () =>
    run(async () => {
      await setStatus(room.id, 'reveal');
      await refresh();
      navigate('/admin/so-sach');
    });

  if (redirect) return redirect;

  // Chỉ người đã ký hợp đồng mới được trả lương (và mới may được áo)
  const workers = players.filter((p) => p.signed);
  const books = summarizeShift(workers, config);
  const ownerLeft = books.totalSurplus; // tiền bán − nguyên liệu − lương
  const top = players.slice(0, 10);
  const maxShirts = Math.max(1, ...top.map((p) => p.shirts));
  const clock = playing ? (left ?? room.duration_sec) : 0;

  return (
    <AdminLayout
      chip={`Vòng 1, phòng ${room.code}`}
      actions={
        <>
          <label className="check" htmlFor="projector">
            <input id="projector" type="checkbox" checked={projector} onChange={(e) => setProjector(e.target.checked)} />
            Chế độ chiếu: ẩn sổ sách
          </label>
          {playing && (
            <button type="button" className="sbtn plain" onClick={endNow} disabled={busy}>
              Kết thúc ca
            </button>
          )}
        </>
      }
    >
      <div className="abody">
        <div className="amain">
          <div className={styles.scoreRow}>
            <div>
              <div className={styles.cap}>Còn lại</div>
              <div className={`${styles.clock} num`}>{mmss(clock)}</div>
            </div>
            <div className={styles.right}>
              <div className={styles.cap}>Cả lớp đã may</div>
              <div className={`${styles.total} num`}>
                {formatNumber(books.totalShirts)} <span>áo</span>
              </div>
            </div>
          </div>

          <h2 className={styles.h2}>Mười công nhân may nhiều nhất</h2>
          {top.length === 0 ? (
            <p className={styles.cap}>Chưa có công nhân nào trong phòng.</p>
          ) : (
            <ol className={styles.board}>
              {top.map((p, i) => (
                <li key={p.id}>
                  <span className={`${styles.rank} num`}>{i + 1}</span>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.track}>
                    <i style={{ width: `${(p.shirts / maxShirts) * 100}%` }} />
                  </span>
                  <b className={`${styles.n} num`}>{p.shirts}</b>
                </li>
              ))}
            </ol>
          )}

          {error && (
            <p className={`alert ${styles.error}`} role="alert">
              {error}
            </p>
          )}

          {room.status === 'ended' && (
            <div className={`status ${styles.done}`}>
              <b>Hết ca.</b>
              <button type="button" className="sbtn fill" onClick={toReveal} disabled={busy}>
                Sang Vòng 2: lật sổ sách
              </button>
            </div>
          )}
        </div>

        <aside className="aside" hidden={projector}>
          <div className="panel">
            <h2 className={styles.panelTitle}>Sổ sách của chủ xưởng</h2>
            <p className={styles.panelNote}>Chỉ hiện trên laptop.</p>
            <LedgerLines
              variant="plain"
              rows={[
                { label: 'Tiền bán áo', value: <b className="num">{formatXu(books.revenue)}</b> },
                { label: 'Nguyên liệu', value: <b className="num">{formatXu(-books.materialCost)}</b> },
                {
                  label: `Lương phải trả (${workers.length} người)`,
                  value: <b className="num">{formatXu(-books.totalWage)}</b>,
                },
              ]}
            />
            <div className={styles.leftBox} data-positive={ownerLeft >= 0 || undefined}>
              <div className={styles.leftCap}>Chủ xưởng còn lại</div>
              <div className={`${styles.leftVal} num`}>{formatXu(ownerLeft)}</div>
              <div className={styles.leftNote}>
                {ownerLeft < 0
                  ? 'Chưa đủ tiền trả lương. Công nhân đang làm ra phần lương của chính họ.'
                  : 'Đã đủ tiền trả lương. Từ đây, áo may thêm là phần dư của chủ.'}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
