import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CenterMessage } from '../components/CenterMessage';
import {
  createRoom,
  getMyLatestRoom,
  getRoom,
  watchOwnerRoom,
  watchPlayers,
  type Player,
  type Room,
  type RoomStatus,
} from '../lib/api';
import { botEngine } from '../lib/bots';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

// ---------------------------------------------------------------------
// Chặn các trang /admin/* khi chưa đăng nhập
// ---------------------------------------------------------------------

/** Bọc các route chủ xưởng: chưa đăng nhập thì chuyển về /admin/dang-nhap. */
export function RequireOwner() {
  const location = useLocation();
  const [auth, setAuth] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setAuth(data.session ? 'in' : 'out'));
    // Đăng xuất ở tab khác hoặc phiên hết hạn cũng chuyển về trang đăng nhập
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuth(session ? 'in' : 'out'));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <CenterMessage title="Chưa cấu hình Supabase">
        <p>Tạo file .env theo mẫu .env.example rồi chạy lại npm run dev.</p>
      </CenterMessage>
    );
  }
  if (auth === 'loading') return <CenterMessage title="Đang kiểm tra đăng nhập…" />;
  if (auth === 'out') return <Navigate to="/admin/dang-nhap" replace state={{ from: location.pathname }} />;

  return (
    <OwnerRoomProvider>
      <Outlet />
    </OwnerRoomProvider>
  );
}

// ---------------------------------------------------------------------
// Phòng của chủ xưởng: dùng chung cho phòng chờ, đang chạy ca, sổ sách
// ---------------------------------------------------------------------

interface OwnerRoomState {
  room: Room;
  /** Đọc lại phòng từ server (gọi sau mỗi RPC đổi trạng thái) */
  refresh: () => Promise<void>;
  /** Cập nhật tạm phía client trước khi server trả lời */
  patchRoom: (patch: Partial<Room>) => void;
}

const Ctx = createContext<OwnerRoomState | null>(null);

function OwnerRoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Lấy phòng mới nhất của chủ xưởng; chưa có thì tạo. Ref chặn StrictMode tạo 2 phòng.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        setRoom((await getMyLatestRoom()) ?? (await createRoom()));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const roomId = room?.id;
  useEffect(() => {
    if (!roomId) return;
    return watchOwnerRoom(roomId, setRoom);
  }, [roomId]);

  // Người chơi ảo (trang Thử tải) chạy theo trạng thái phòng, ở mọi trang chủ xưởng
  const status = room?.status;
  const startedAt = room?.started_at ?? null;
  const endsAt = room?.ends_at ?? null;
  const duration = room?.duration_sec ?? 0;
  useEffect(() => {
    if (!roomId || !status) return;
    botEngine.attach({ id: roomId, status, started_at: startedAt, ends_at: endsAt, duration_sec: duration });
  }, [roomId, status, startedAt, endsAt, duration]);
  useEffect(() => () => botEngine.detach(), []);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const r = await getRoom(roomId);
    if (r) setRoom(r);
  }, [roomId]);

  const patchRoom = useCallback((patch: Partial<Room>) => {
    setRoom((r) => (r ? { ...r, ...patch } : r));
  }, []);

  if (error) {
    return (
      <CenterMessage title="Không mở được phòng">
        <p className="alert" role="alert">
          {error}
        </p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Thử lại
        </button>
      </CenterMessage>
    );
  }
  if (!room) return <CenterMessage title="Đang mở phòng…" />;

  return <Ctx.Provider value={{ room, refresh, patchRoom }}>{children}</Ctx.Provider>;
}

export function useOwnerRoom(): OwnerRoomState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOwnerRoom phải nằm trong RequireOwner');
  return v;
}

/** Trang ứng với từng trạng thái phòng */
export function pathForStatus(status: RoomStatus): string {
  if (status === 'lobby') return '/admin';
  if (status === 'reveal') return '/admin/so-sach';
  return '/admin/dang-chay';
}

/**
 * Nếu trạng thái phòng không thuộc trang này thì trả về <Navigate> sang trang đúng.
 * Nhờ vậy sau mỗi RPC chỉ cần refresh(), trang tự chuyển theo trạng thái mới.
 */
export function useStatusRedirect(allowed: RoomStatus[]): ReactNode {
  const { room } = useOwnerRoom();
  return allowed.includes(room.status) ? null : <Navigate to={pathForStatus(room.status)} replace />;
}

/** Danh sách công nhân của phòng, cập nhật realtime, xếp theo số áo giảm dần. */
export function usePlayers(roomId: string): { players: Player[]; loaded: boolean; refresh: () => void } {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    setLoaded(false);
    const w = watchPlayers(roomId, (list) => {
      setPlayers(list);
      setLoaded(true);
    });
    refreshRef.current = w.refresh;
    return w.unsubscribe;
  }, [roomId]);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { players, loaded, refresh };
}

/** Lưu một lựa chọn bật/tắt trong localStorage (chế độ chiếu…). */
export function useStoredFlag(key: string, initial = false): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : raw === '1';
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? '1' : '0');
      } catch {
        /* trình duyệt chặn lưu: chỉ nhớ trong phiên này */
      }
    },
    [key],
  );
  return [value, set];
}
