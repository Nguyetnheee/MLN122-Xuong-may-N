import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { MAX_PLAYERS } from '../../lib/api';
import { BOT_SUFFIX, botEngine } from '../../lib/bots';
import { MOCK_WORKERS } from '../../lib/mockData';
import { pathForStatus, useOwnerRoom, usePlayers } from '../../state/OwnerRoom';
import styles from './LoadTestPage.module.css';

const BOT_COUNT = 30;
const STATUS_TEXT = {
  lobby: 'Phòng chờ',
  playing: 'Đang chạy ca',
  ended: 'Hết ca',
  reveal: 'Vòng 2',
} as const;

/** Thử tải: tạo 30 người chơi ảo để nhóm tập dượt khi không đủ người. */
export function LoadTestPage() {
  const { room } = useOwnerRoom();
  const { players } = usePlayers(room.id);
  const navigate = useNavigate();
  const snap = useSyncExternalStore(botEngine.subscribe, botEngine.getSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const botsInRoom = players.filter((p) => p.is_bot);
  const realPlayers = players.length - botsInRoom.length;
  const free = MAX_PLAYERS - players.length;
  const lobby = room.status === 'lobby';
  const orphanBots = botsInRoom.length - snap.count;

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const create = () =>
    run(async () => {
      const names = MOCK_WORKERS.slice(0, BOT_COUNT).map((w) => w.name + BOT_SUFFIX);
      const n = await botEngine.add(room.id, names);
      return n === 0
        ? 'Không thêm được ai: phòng đã đủ người hoặc người ảo đã có sẵn.'
        : `Đã thêm ${n} người chơi ảo. Họ sẽ đọc và ký hợp đồng trong vài giây.`;
    });

  const remove = () =>
    run(async () => {
      const n = await botEngine.removeAll(room.id);
      return `Đã xóa ${n} người chơi ảo.`;
    });

  return (
    <AdminLayout
      chip={`Thử tải, phòng ${room.code}`}
      actions={
        <button type="button" className="sbtn" onClick={() => navigate(pathForStatus(room.status))}>
          {lobby ? 'Về phòng chờ' : `Sang màn ${STATUS_TEXT[room.status].toLowerCase()}`}
        </button>
      }
    >
      <div className="abody">
        <div className={`amain ${styles.main}`}>
          <div>
            <h1 className={styles.title}>Tập dượt với người chơi ảo</h1>
            <p className={styles.lead}>
              Tạo {BOT_COUNT} công nhân ảo để thử cả buổi khi không đủ người. Họ vào phòng, ký hợp đồng, rồi may áo
              với tốc độ khác nhau trong ca, qua đúng các bước server kiểm tra như sinh viên thật.
            </p>
          </div>

          <ol className={styles.steps}>
            <li>Ở phòng chờ, bấm “Tạo {BOT_COUNT} người chơi ảo”.</li>
            <li>Về phòng chờ, đợi họ chuyển sang “đã ký”, rồi bấm “Bắt đầu ca”.</li>
            <li>Người ảo tự may áo đến hết ca. Giữ tab này mở (ở bất kỳ màn chủ xưởng nào).</li>
            <li>Sau buổi tập, bấm “Xóa người ảo” hoặc “Chơi lại” ở màn sổ sách.</li>
          </ol>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="status" role="status">
              {message}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className="btn" onClick={create} disabled={busy || !lobby || free <= 0}>
              Tạo {BOT_COUNT} người chơi ảo
            </button>
            <button type="button" className="btn ghost" onClick={remove} disabled={busy || botsInRoom.length === 0}>
              Xóa người ảo
            </button>
          </div>
          {!lobby && <p className={styles.note}>Chỉ tạo người ảo được khi phòng đang ở phòng chờ.</p>}
          {lobby && free <= 0 && <p className={styles.note}>Phòng đã đủ {MAX_PLAYERS} người.</p>}
        </div>

        <aside className="aside">
          <div className="panel">
            <h2 className={styles.panelTitle}>Tình trạng</h2>
            <dl className={styles.stats}>
              <div>
                <dt>Phòng</dt>
                <dd>{STATUS_TEXT[room.status]}</dd>
              </div>
              <div>
                <dt>Sinh viên thật</dt>
                <dd className="num">{realPlayers}</dd>
              </div>
              <div>
                <dt>Người ảo trong phòng</dt>
                <dd className="num">{botsInRoom.length}</dd>
              </div>
              <div>
                <dt>Người ảo đã ký</dt>
                <dd className="num">{botsInRoom.filter((p) => p.signed).length}</dd>
              </div>
              <div>
                <dt>Áo người ảo đã gửi</dt>
                <dd className="num">{snap.sent}</dd>
              </div>
              <div>
                <dt>Lỗi khi gửi</dt>
                <dd className="num">{snap.errors}</dd>
              </div>
            </dl>
            {snap.lastError && <p className={styles.note}>Lỗi gần nhất: {snap.lastError}</p>}
            {orphanBots > 0 && (
              <p className={styles.note}>
                {orphanBots} người ảo không do tab này điều khiển (tạo ở trình duyệt khác) nên sẽ đứng yên. Bấm “Xóa người
                ảo” rồi tạo lại ở đây.
              </p>
            )}
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
