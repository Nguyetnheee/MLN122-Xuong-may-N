import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { StatTile } from '../../components/StatTile';
import {
  listPlayers,
  listShirts,
  resetRoom,
  roomToConfig,
  setShowTerms,
  shirtSecondsByPlayer,
  type Player,
  type ShirtRow,
} from '../../lib/api';
import { botEngine } from '../../lib/bots';
import { buildResultsCsv, downloadText } from '../../lib/csv';
import { summarizeShift, type ShiftEntry } from '../../lib/economics';
import { formatDuration, formatNumber, formatXu, mmss } from '../../lib/format';
import { useOwnerRoom, useStatusRedirect } from '../../state/OwnerRoom';
import styles from './LedgerPage.module.css';

const SURPLUS_FILL = 'repeating-linear-gradient(135deg, var(--amber-fill) 0 8px, var(--amber-soft) 8px 16px)';

/** Vòng 2 chiếu lên lớp: lật sổ sách thật của ca vừa rồi (players + shirts). */
export function LedgerPage() {
  const redirect = useStatusRedirect(['ended', 'reveal']);
  const { room, refresh, patchRoom } = useOwnerRoom();
  const navigate = useNavigate();
  const [data, setData] = useState<{ players: Player[]; shirts: ShirtRow[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [csvDone, setCsvDone] = useState(false);
  const config = roomToConfig(room);
  const marx = room.show_terms;
  const csvName = `ket-qua-phong-${room.code}.csv`;

  // Sau khi hết ca dữ liệu không đổi nữa: tải một lần
  useEffect(() => {
    let alive = true;
    Promise.all([listPlayers(room.id), listShirts(room.id)])
      .then(([players, shirts]) => {
        if (alive) setData({ players, shirts });
      })
      .catch((e: Error) => {
        if (alive) setLoadError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [room.id]);

  const s = useMemo(() => {
    if (!data) return null;
    const times = room.started_at ? shirtSecondsByPlayer(data.shirts, room.started_at) : null;
    // Chỉ người đã ký hợp đồng mới là công nhân của ca (được trả lương)
    const entries: ShiftEntry[] = data.players
      .filter((p) => p.signed)
      .sort((a, b) => b.shirts - a.shirts)
      .map((p) => ({ name: p.name, shirts: p.shirts, shirtSeconds: times ? (times.get(p.id) ?? []) : undefined }));
    return summarizeShift(entries, config);
    // config được dựng lại mỗi lần render từ các trường của room, nên phụ thuộc vào chính các trường đó
  }, [data, room.started_at, room.duration_sec, room.wage, room.price, room.material]);

  async function toggleTerms() {
    setActionError(null);
    patchRoom({ show_terms: !marx }); // đổi nhãn ngay trên máy chiếu
    try {
      await setShowTerms(room.id, !marx);
    } catch (e) {
      patchRoom({ show_terms: marx });
      setActionError((e as Error).message);
    }
  }

  function exportCsv() {
    if (!s) return;
    downloadText(csvName, buildResultsCsv(s));
    setCsvDone(true);
  }

  async function playAgain() {
    if (!window.confirm('Xóa toàn bộ kết quả ca này và quay về phòng chờ? Nên Xuất CSV trước nếu cần giữ lại.')) return;
    setBusy(true);
    setActionError(null);
    try {
      await resetRoom(room.id);
      botEngine.forget(room.id); // server đã xóa cả người chơi ảo
      await refresh();
      navigate('/admin');
    } catch (e) {
      setActionError((e as Error).message);
      setBusy(false);
    }
  }

  if (redirect) return redirect;

  return (
    <AdminLayout
      chip={`Vòng 2, phòng ${room.code}`}
      actions={
        <>
          <button type="button" className="sbtn fill" aria-pressed={marx} onClick={toggleTerms}>
            {marx ? 'Ẩn tên gọi' : 'Hiện tên gọi theo Mác'}
          </button>
          <button type="button" className="sbtn" onClick={exportCsv} disabled={!s}>
            Xuất CSV
          </button>
          <button type="button" className="sbtn plain" onClick={playAgain} disabled={busy}>
            Chơi lại
          </button>
        </>
      }
    >
      {csvDone && (
        <p className={styles.csvNote} role="status">
          Đã tải file {csvName} gồm bảng tổng kết bên dưới.
        </p>
      )}
      {actionError && (
        <p className={`alert ${styles.banner}`} role="alert">
          {actionError}
        </p>
      )}

      {loadError ? (
        <div className={styles.body}>
          <p className="alert" role="alert">
            Không tải được sổ sách: {loadError}
          </p>
        </div>
      ) : !s ? (
        <div className={styles.body}>
          <p className={styles.lead}>Đang mở sổ sách…</p>
        </div>
      ) : s.workers.length === 0 ? (
        <div className={styles.body}>
          <h1 className={styles.title}>Sổ sách trống</h1>
          <p className={styles.lead}>Ca này không có công nhân nào ký hợp đồng. Bấm “Chơi lại” để mở ca mới.</p>
        </div>
      ) : (
        <LedgerBody s={s} marx={marx} config={config} />
      )}
    </AdminLayout>
  );
}

function LedgerBody({
  s,
  marx,
  config,
}: {
  s: ReturnType<typeof summarizeShift>;
  marx: boolean;
  config: ReturnType<typeof roomToConfig>;
}) {
  // Dòng tiền dạng thác nước, thang đo là tiền bán áo
  const scale = Math.max(1, s.revenue);
  const afterMaterial = s.revenue - s.materialCost;
  const flow = [
    {
      label: 'Tiền bán áo',
      term: 'Giá trị hàng hóa G = c + v + m',
      value: formatNumber(s.revenue),
      from: 0,
      width: s.revenue,
      fill: 'var(--green)',
      color: 'var(--ink)',
      termColor: 'var(--ink3)',
    },
    {
      label: 'Trừ nguyên liệu',
      term: 'Tư bản bất biến (c)',
      value: '− ' + formatNumber(s.materialCost),
      from: afterMaterial,
      width: s.materialCost,
      fill: 'var(--c-fill)',
      color: 'var(--ink)',
      termColor: 'var(--ink3)',
    },
    {
      label: `Trừ lương ${s.workers.length} bạn`,
      term: 'Tư bản khả biến (v)',
      value: '− ' + formatNumber(s.totalWage),
      from: Math.max(0, afterMaterial - s.totalWage),
      width: Math.min(s.totalWage, afterMaterial),
      fill: 'var(--leaf)',
      color: 'var(--green)',
      termColor: 'var(--green)',
    },
    {
      label: s.totalSurplus >= 0 ? 'Chủ xưởng còn dư' : 'Chủ xưởng bù lỗ',
      term: 'Giá trị thặng dư (m)',
      value: (s.totalSurplus < 0 ? '− ' : '') + formatNumber(Math.abs(s.totalSurplus)),
      from: 0,
      width: Math.max(0, s.totalSurplus),
      fill: SURPLUS_FILL,
      color: 'var(--amber-deep)',
      termColor: 'var(--amber-deep)',
    },
  ];

  // Biểu đồ từng người: thang đo là người tạo ra nhiều giá trị nhất
  const maxValue = Math.max(config.wage, ...s.workers.map((w) => w.valueCreated));

  return (
    <div className={styles.body}>
      <section>
        <h1 className={styles.title}>Sổ sách thật của ca làm vừa rồi</h1>
        <p className={styles.lead}>
          {s.workers.length} công nhân, {formatDuration(config.shiftSeconds)}, {formatNumber(s.totalShirts)} chiếc áo.
          Mỗi áo bán {config.price} xu, nguyên liệu {config.material} xu.
        </p>
        <div className={styles.flow}>
          {flow.map((row, i) => (
            <div key={i} className={styles.row}>
              <div>
                <b className={styles.rowLabel}>{row.label}</b>
                {marx && (
                  <div className={styles.tag} style={{ color: row.termColor }}>
                    {row.term}
                  </div>
                )}
              </div>
              <div className={styles.tr}>
                <i
                  style={{
                    left: `${(row.from / scale) * 100}%`,
                    width: `${(row.width / scale) * 100}%`,
                    background: row.fill,
                    animationDelay: `${i * 250}ms`,
                  }}
                />
              </div>
              <div className={`${styles.val} num`} style={{ color: row.color }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.tiles}>
        <StatTile
          tone="amber"
          label={marx ? 'Tỷ suất giá trị thặng dư m′ = m ÷ v' : 'Phần dư so với tiền lương'}
          value={`${Math.round(s.surplusRate)}%`}
          note={`${formatXu(s.totalSurplus)} ÷ ${formatXu(s.totalWage)} tiền lương`}
        />
        <StatTile
          tone="green"
          label="Trung bình mỗi bạn làm đủ lương sau"
          value={s.averageSecondsToCoverWage === null ? '–' : mmss(s.averageSecondsToCoverWage)}
          note={`trên tổng ${mmss(config.shiftSeconds)} của ca`}
        />
        <StatTile tone="outline">
          {s.most && (
            <div>
              <div className={styles.small}>May nhiều nhất</div>
              <b className={styles.who}>
                {s.most.name}, {s.most.shirts} áo, nhận {config.wage} xu
              </b>
            </div>
          )}
          {s.least && (
            <div>
              <div className={styles.small}>May ít nhất</div>
              <b className={styles.who}>
                {s.least.name}, {s.least.shirts} áo, nhận {config.wage} xu
              </b>
            </div>
          )}
        </StatTile>
      </section>

      <section>
        <div className={styles.secHead}>
          <h2 className={styles.h2}>Mỗi người tạo ra bao nhiêu, nhận bao nhiêu</h2>
          <div className={styles.keys}>
            <span>
              <span className={`sw ${styles.keySw}`} style={{ background: 'var(--leaf)' }} />
              {marx ? 'Giá trị sức lao động (lương)' : 'Phần trả lương'}
            </span>
            <span>
              <span className={`sw hatch ${styles.keySw}`} />
              {marx ? 'Giá trị thặng dư' : 'Phần cho chủ xưởng'}
            </span>
          </div>
        </div>
        <ol className={styles.stack}>
          {s.workers.map((w, i) => (
            <li key={i}>
              <span className={styles.name}>{w.name}</span>
              <span className={styles.bar}>
                <span
                  className={styles.barG}
                  style={{ width: `${(Math.min(w.wage, w.valueCreated) / maxValue) * 100}%` }}
                />
                {w.surplus > 0 && (
                  <span className={`${styles.barA} hatch`} style={{ width: `${(w.surplus / maxValue) * 100}%` }} />
                )}
              </span>
              <b className="num">{w.valueCreated} xu</b>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={styles.h2} style={{ marginBottom: 12 }}>
          Bảng tổng kết
        </h2>
        <div className={styles.tablebox}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Công nhân</th>
                <th scope="col">Số áo</th>
                <th scope="col">Giá trị tạo ra</th>
                <th scope="col">{marx ? 'Lương (v)' : 'Lương nhận'}</th>
                <th scope="col">{marx ? 'Thặng dư (m)' : 'Phần cho chủ'}</th>
                <th scope="col">Đủ lương sau</th>
              </tr>
            </thead>
            <tbody>
              {s.workers.map((w, i) => (
                <tr key={i}>
                  <th scope="row">{w.name}</th>
                  <td>{w.shirts}</td>
                  <td>{formatXu(w.valueCreated)}</td>
                  <td className={styles.tdG}>{formatXu(w.wage)}</td>
                  <td className={styles.tdA}>{formatXu(w.surplus)}</td>
                  <td>{w.secondsToCoverWage === null ? 'Chưa đủ' : mmss(w.secondsToCoverWage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
