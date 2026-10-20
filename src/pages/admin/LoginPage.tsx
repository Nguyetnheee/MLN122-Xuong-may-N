import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInOwner } from '../../lib/api';
import { FACTORY_NAME } from '../../lib/mockData';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import styles from './LoginPage.module.css';

/** Đăng nhập chủ xưởng bằng Supabase Auth. Không có đăng ký: tài khoản tạo tay trong Supabase. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Đã đăng nhập sẵn thì vào thẳng phòng chờ
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(from, { replace: true });
    });
  }, [from, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !pass) {
      setError('Nhập email và mật khẩu để tiếp tục.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Chưa cấu hình Supabase (thiếu file .env).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInOwner(email, pass);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.l}>
        <div className={styles.factory}>{FACTORY_NAME}</div>
        <div>
          <h1 className={styles.title}>Ca làm 3 phút</h1>
          <p className={styles.lead}>
            Trò chơi mở đầu cho bài Giá trị thặng dư, môn MLN122. Chỉ chủ xưởng thấy sổ sách thật của ca làm.
          </p>
        </div>
        <div className={styles.note}>Sinh viên vào chơi bằng mã phòng, không cần đăng nhập.</div>
      </div>

      <div className={styles.r}>
        <form onSubmit={submit} noValidate className={styles.form}>
          <h2 className={styles.formTitle}>Đăng nhập chủ xưởng</h2>
          <label className="field" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field" htmlFor="pass">
            Mật khẩu
            <input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={`btn ${styles.submit}`} disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
          <p className={styles.small}>Tài khoản chủ xưởng do nhóm tạo trong Supabase, không đăng ký ở đây.</p>
        </form>
      </div>
    </div>
  );
}
