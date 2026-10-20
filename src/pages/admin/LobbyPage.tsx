import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { MAX_PLAYERS, roomToConfig, signOutOwner, startShift, updateSettings } from '../../lib/api';
import { newValuePerShirt, shirtsToCoverWage, validateConfig, type ShiftConfig } from '../../lib/economics';
import { useOwnerRoom, usePlayers, useStatusRedirect } from '../../state/OwnerRoom';
import styles from './LobbyPage.module.css';

const FIELDS: { key: keyof ShiftConfig; id: string; label: string }[] = [
  { key: 'shiftSeconds', id: 'sSecs', label: 'Thời gian ca (giây)' },
  { key: 'wage', id: 'sWage', label: 'Lương cả ca (xu)' },
  { key: 'price', id: 'sPrice', label: 'Giá bán 1 áo (xu)' },
  { key: 'material', id: 'sMat', label: 'Nguyên liệu 1 áo (xu)' },
];

type Draft = Record<keyof ShiftConfig, string>;
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

function toDraft(c: ShiftConfig): Draft {
  return {
    shiftSeconds: String(c.shiftSeconds),
    wage: String(c.wage),
    price: String(c.price),
    material: String(c.material),
  };
}

function parseDraft(d: Draft): ShiftConfig {
  const n = (s: string) => (s.trim() === '' ? NaN : Number(s));
  return { shiftSeconds: n(d.shiftSeconds), wage: n(d.wage), price: n(d.price), material: n(d.material) };
}

/** Phòng chờ, chiếu lên cho lớp quét mã. Ô cài đặt chỉ chủ xưởng thấy. */
export function LobbyPage() {
  const redirect = useStatusRedirect(['lobby']);
  const { room, refresh } = useOwnerRoom();
  const { players, loaded } = usePlayers(room.id);
  const navigate = useNavigate();

  // Giữ dạng chữ để ô nhập được phép trống khi đang gõ
  const [draft, setDraft] = useState<Draft>(() => toDraft(roomToConfig(room)));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<ShiftConfig | null>(null);

  const parsed = parseDraft(draft);
  const error = validateConfig(parsed);
  const nv = newValuePerShirt(parsed.price, parsed.material);
  const needed = shirtsToCoverWage(parsed.wage, nv);
  const signedCount = players.filter((p) => p.signed).length;
  const joinUrl = `${window.location.origin}/?room=${room.code}`;

  async function save(c: ShiftConfig): Promise<boolean> {
    pending.current = null;
    setSaveState('saving');
    try {
      await updateSettings(room.id, c);
      setSaveState('saved');
      setSaveError(null);
      return true;
    } catch (e) {
      setSaveState('error');
      setSaveError((e as Error).message);
      return false;
    }
  }

  function change(key: keyof ShiftConfig, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    window.clearTimeout(timer.current);
    const c = parseDraft(next);
    if (validateConfig(c)) {
      pending.current = null;
      setSaveState('idle');
      return;
    }
    // Chờ 500ms sau lần gõ cuối mới lưu lên server
    pending.current = c;
    setSaveState('pending');
    timer.current = window.setTimeout(() => save(c), 500);
  }

  // Rời trang khi còn thay đổi chưa lưu thì lưu nốt
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current) updateSettings(room.id, pending.current).catch(() => {});
    },
    [room.id],
  );

  async function start() {
    if (error || starting) return;
    setStarting(true);
    setStartError(null);
    window.clearTimeout(timer.current);
    if (pending.current && !(await save(pending.current))) {
      setStarting(false);
      return;
    }
    try {
      await startShift(room.id);
      await refresh();
      navigate('/admin/dang-chay');
    } catch (e) {
      setStartError((e as Error).message);
      setStarting(false);
    }
  }

  async function logout() {
    await signOutOwner();
    navigate('/admin/dang-nhap', { replace: true });
  }

  if (redirect) return redirect;

  const saveNote: Record<SaveState, string> = {
    idle: '',
    pending: 'Chưa lưu…',
    saving: 'Đang lưu…',
    saved: 'Đã lưu',
    error: saveError ?? 'Không lưu được.',
  };

  return (
    <AdminLayout
      chip={`Phòng chờ, phòng ${room.code}`}
      actions={
        <>
          <button type="button" className="sbtn" onClick={() => navigate('/admin/thu-tai')}>
            Thử tải
          </button>
          <button type="button" className="sbtn plain" onClick={logout}>
            Đăng xuất
          </button>
        </>
      }
    >
      <div className="abody">
        <div className={`amain ${styles.main}`}>
          <div className={styles.joinRow}>
            <div className={styles.joinText}>
              <div className={styles.cap}>Vào phòng tại</div>
              <div className={styles.address}>{window.location.host}</div>
              <div className={styles.cap} style={{ marginTop: 20 }}>
                Mã phòng
              </div>
              <div className={`${styles.code} num`}>{room.code}</div>
            </div>
            <div className={styles.qr}>
              <QRCodeSVG
                value={joinUrl}
                size={176}
                level="M"
                fgColor="#142019"
                bgColor="#FFFFFF"
                title={`Mã QR vào phòng ${room.code}`}
              />
            </div>
          </div>

          <div>
            <div className={styles.playersHead}>
              <h2 className={styles.h2}>Công nhân đã vào</h2>
              <b className={`${styles.joined} num`} aria-live="polite">
                {players.length} / {MAX_PLAYERS} <span>({signedCount} đã ký)</span>
              </b>
            </div>
            {loaded && players.length === 0 ? (
              <p className={styles.empty}>Chưa có ai vào. Mời cả lớp quét mã QR hoặc nhập mã phòng.</p>
            ) : (
              <ul className={styles.players}>
                {[...players]
                  .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
                  .map((p) => (
                    <li key={p.id} className={p.signed ? undefined : styles.wait}>
                      <span className="dot" />
                      {p.name} <small>{p.signed ? 'đã ký' : 'đang đọc'}</small>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="aside">
          <div className="panel">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Cài đặt ca làm</h2>
              <span className={styles.saveNote} role="status">
                {saveState === 'error' ? '' : saveNote[saveState]}
              </span>
            </div>
            <p className={styles.panelNote}>
              Sinh viên chỉ thấy lương và thời gian. Giá áo và nguyên liệu được giấu đến Vòng 2.
            </p>
            <div className={styles.grid2}>
              {FIELDS.map((f) => (
                <label key={f.key} className="field" htmlFor={f.id}>
                  {f.label}
                  <input
                    id={f.id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="num"
                    value={draft[f.key]}
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className={styles.derived}>
              <div>
                <span>Giá trị mới mỗi áo</span>
                <b className="num">{nv > 0 ? nv : 0} xu</b>
              </div>
              <div>
                <span>Cần may để đủ lương</span>
                <b className="num">{!error && Number.isFinite(needed) ? `${needed} áo` : '–'}</b>
              </div>
            </div>
            {error && (
              <p className={`warn ${styles.err}`} role="alert">
                {error}
              </p>
            )}
            {saveState === 'error' && (
              <p className={`warn ${styles.err}`} role="alert">
                {saveNote.error}
              </p>
            )}
          </div>
          {startError && (
            <p className="alert" role="alert">
              {startError}
            </p>
          )}
          <button type="button" className="btn" disabled={!!error || starting || signedCount === 0} onClick={start}>
            {starting ? 'Đang bắt đầu…' : 'Bắt đầu ca'}
          </button>
          <p className={styles.small}>
            {signedCount === 0
              ? 'Cần ít nhất một bạn ký hợp đồng mới bắt đầu được.'
              : 'Những bạn chưa ký hợp đồng sẽ không vào được ca này.'}
          </p>
        </aside>
      </div>
    </AdminLayout>
  );
}
