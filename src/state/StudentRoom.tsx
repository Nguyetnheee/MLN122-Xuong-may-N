import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { PhoneScreen } from '../components/PhoneScreen';
import {
  getPlayer,
  watchPublicRoom,
  type Player,
  type PlayerCredentials,
  type PublicRoom,
  type RoomStatus,
} from '../lib/api';
import { useAppState } from './AppState';

/**
 * Bọc các màn sinh viên sau khi vào phòng.
 * Chưa vào phòng thì về trang /. Màn hình tự chuyển theo trạng thái phòng do chủ xưởng điều khiển.
 */
export function RequireStudent() {
  const { student } = useAppState();
  if (!student.credentials) return <Navigate to="/" replace />;
  return (
    <StudentRoomProvider code={student.room} credentials={student.credentials}>
      <Outlet />
    </StudentRoomProvider>
  );
}

interface StudentRoomState {
  room: PublicRoom;
  me: Player;
  credentials: PlayerCredentials;
  /** Đọc lại dòng của chính mình (đã ký chưa, số áo server đã ghi nhận) */
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<StudentRoomState | null>(null);

function StudentRoomProvider({
  code,
  credentials,
  children,
}: {
  code: string;
  credentials: PlayerCredentials;
  children: ReactNode;
}) {
  const { updateStudent } = useAppState();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  /** undefined = đang tải; null = đã bị xóa khỏi phòng */
  const [me, setMe] = useState<Player | null | undefined>(undefined);

  useEffect(() => watchPublicRoom(code, setRoom), [code]);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await getPlayer(credentials.player_id));
    } catch {
      /* mất mạng: giữ thông tin cũ, lần sau thử lại */
    }
  }, [credentials.player_id]);

  // Mỗi khi phòng đổi trạng thái thì đọc lại mình (có thể đã bị xóa khi chủ xưởng "Chơi lại")
  const status = room?.status;
  useEffect(() => {
    refreshMe();
  }, [status, refreshMe]);

  const gone = me === null;
  useEffect(() => {
    if (gone) updateStudent({ credentials: null });
  }, [gone, updateStudent]);

  if (gone) {
    return <Navigate to="/" replace state={{ notice: 'Chủ xưởng đã mở ca mới. Hãy vào phòng lại.' }} />;
  }
  if (!room || !me) {
    return (
      <PhoneScreen>
        <div className="ph-pad" style={{ paddingTop: 56 }} role="status">
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Đang vào phòng {code}…</h1>
          <p style={{ marginTop: 8, color: 'var(--ink2)' }}>Nếu chờ lâu, kiểm tra lại kết nối mạng.</p>
        </div>
      </PhoneScreen>
    );
  }

  return <Ctx.Provider value={{ room, me, credentials, refreshMe }}>{children}</Ctx.Provider>;
}

export function useStudentRoom(): StudentRoomState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStudentRoom phải nằm trong RequireStudent');
  return v;
}

const STUDENT_PATH: Record<RoomStatus, string> = {
  lobby: '/hop-dong',
  playing: '/may-ao',
  ended: '/phieu-luong',
  reveal: '/lat-bai',
};

/** Điện thoại luôn ở đúng màn của trạng thái phòng: trả về <Navigate> nếu đang ở màn khác. */
export function useStudentRedirect(): ReactNode {
  const { room } = useStudentRoom();
  const { pathname } = useLocation();
  const target = STUDENT_PATH[room.status];
  return pathname === target ? null : <Navigate to={target} replace />;
}

/** Màn báo cho người vào phòng nhưng không ký hợp đồng trước khi ca bắt đầu */
export function NotHired() {
  const { room, me } = useStudentRoom();
  const { updateStudent } = useAppState();
  return (
    <PhoneScreen>
      <div className="ph-pad" style={{ paddingTop: 56, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
          Phòng {room.code}, {me.name}
        </div>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 800 }}>Bạn chưa ký hợp đồng</h1>
        <p style={{ color: 'var(--ink2)' }}>
          Ca làm đã bắt đầu nên bạn không được nhận vào ca này. Nhìn lên máy chiếu để theo dõi cùng cả lớp.
        </p>
      </div>
      <div className="grow" />
      <div className="ph-pad">
        <Link to="/" className="btn ghost" onClick={() => updateStudent({ credentials: null })}>
          Rời phòng
        </Link>
      </div>
    </PhoneScreen>
  );
}
