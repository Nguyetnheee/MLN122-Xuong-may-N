import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneScreen } from '../../components/PhoneScreen';
import { useAppState } from '../../state/AppState';
import styles from './JoinPage.module.css';

/** Vào phòng: nhập mã phòng 4 số và tên. */
export function JoinPage() {
  const { student, updateStudent } = useAppState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Quét QR trên máy chiếu sẽ mở /?room=<mã>: điền sẵn mã phòng
  const roomFromLink = (params.get('room') ?? '').replace(/\D/g, '').slice(0, 4);
  const [room, setRoom] = useState(roomFromLink || student.room);
  const [name, setName] = useState(student.name);
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const ok = /^\d{4}$/.test(room) && name.trim() !== '';
    setError(!ok);
    if (!ok) return;
    updateStudent({ room, name: name.trim(), signed: false, shirts: null });
    navigate('/hop-dong');
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
              placeholder="Ví dụ: Tuấn Kiệt"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {error && (
            <p className="warn" role="alert">
              Điền đủ mã phòng 4 số và tên để vào phòng.
            </p>
          )}
        </div>

        <div className="grow" />

        <div className={`ph-pad ${styles.foot}`}>
          <button type="submit" className="btn">
            Vào phòng
          </button>
          <p className={styles.small}>Không cần đăng ký tài khoản.</p>
        </div>
      </form>
    </PhoneScreen>
  );
}
