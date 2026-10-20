import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneScreen } from '../../components/PhoneScreen';
import { joinRoom } from '../../lib/api';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAppState } from '../../state/AppState';
import styles from './JoinPage.module.css';

/** Vào phòng: nhập mã phòng 4 số và tên, server cấp chỗ qua join_room. */
export function JoinPage() {
  const { student, updateStudent } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  // Quét QR trên máy chiếu sẽ mở /?room=<mã>: điền sẵn mã phòng
  const roomFromLink = (params.get('room') ?? '').replace(/\D/g, '').slice(0, 4);
  const [room, setRoom] = useState(roomFromLink || student.room);
  const [name, setName] = useState(student.name);
  const [error, setError] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [busy, setBusy] = useState(false);

  // Đã vào phòng này rồi (tải lại trang, quét lại QR): cho tiếp tục, không phải nhập lại
  const canResume = student.credentials !== null && (!roomFromLink || roomFromLink === student.room);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(room) || name.trim() === '') {
      setError('Điền đủ mã phòng 4 số và tên để vào phòng.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Trò chơi chưa được cấu hình máy chủ. Báo nhóm thuyết trình.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const credentials = await joinRoom(room, name.trim());
      updateStudent({ room, name: name.trim(), credentials });
      navigate('/hop-dong');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <PhoneScreen>
      <form onSubmit={submit} noValidate className={styles.form}>
        <div className={`ph-pad ${styles.hero}`}>
          <h1 className={styles.title}>Vào ca làm</h1>
          <p className={styles.lead}>Nhập mã phòng trên máy chiếu và tên của bạn để nhận việc.</p>
        </div>

        <div className={styles.card}>
          <label className="field" htmlFor="room">
            Mã phòng
            <input
              id="room"
              className={`${styles.roomInput} num`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              value={room}
              onChange={(e) => setRoom(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </label>
          <label className="field" htmlFor="pname">
            Tên của bạn
            <input
              id="pname"
              autoComplete="nickname"
              enterKeyHint="go"
              maxLength={30}
              placeholder="Ví dụ: Tuấn Kiệt"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="grow" />

        <div className={`ph-pad ${styles.foot}`}>
          {canResume && (
            <button type="button" className="btn ghost" onClick={() => navigate('/hop-dong')}>
              Tiếp tục phòng {student.room} với tên {student.name}
            </button>
          )}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Đang vào phòng…' : 'Vào phòng'}
          </button>
          <p className={styles.small}>Không cần đăng ký tài khoản.</p>
        </div>
      </form>
    </PhoneScreen>
  );
}
