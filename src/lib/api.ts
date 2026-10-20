/**
 * Các hàm gọi Supabase có kiểu TypeScript.
 * Mọi thao tác ghi đều đi qua RPC trong supabase/schema.sql; client chỉ đọc bảng/view.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ShiftConfig } from './economics';
import { supabase } from './supabase';

// ---------------------------------------------------------------------
// Kiểu dữ liệu (khớp với bảng và view trong schema.sql)
// ---------------------------------------------------------------------

export type RoomStatus = 'lobby' | 'playing' | 'ended' | 'reveal';

/** Số người tối đa mỗi phòng (khớp với join_room trong schema.sql) */
export const MAX_PLAYERS = 40;

/** Bảng rooms đầy đủ: chỉ chủ xưởng đọc được */
export interface Room {
  id: string;
  code: string;
  owner_id: string;
  status: RoomStatus;
  duration_sec: number;
  wage: number;
  price: number;
  material: number;
  started_at: string | null;
  ends_at: string | null;
  show_terms: boolean;
  created_at: string;
}

/** View public_rooms: price và material là null cho tới khi status = 'reveal' */
export interface PublicRoom {
  id: string;
  code: string;
  status: RoomStatus;
  duration_sec: number;
  wage: number;
  started_at: string | null;
  ends_at: string | null;
  show_terms: boolean;
  price: number | null;
  material: number | null;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  signed: boolean;
  shirts: number;
  joined_at: string;
  /** Người chơi ảo tạo ở trang /admin/thu-tai */
  is_bot: boolean;
}

export interface ShirtRow {
  player_id: string;
  made_at: string;
}

/** Sinh viên nhận khi vào phòng; cần lưu lại để ký hợp đồng và may áo */
export interface PlayerCredentials {
  player_id: string;
  token: string;
  room_id: string;
}

// ---------------------------------------------------------------------
// Lỗi
// ---------------------------------------------------------------------

export class ApiError extends Error {}

function toApiError(error: { message: string }): ApiError {
  const msg = error.message || '';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  if (/jwt|invalid api key|no api ?key/i.test(msg)) {
    return new ApiError('Cấu hình Supabase chưa đúng (kiểm tra file .env).');
  }
  // Lỗi từ RPC đã được viết sẵn bằng tiếng Việt trong schema.sql
  return new ApiError(msg);
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error);
  return data as T;
}

// ---------------------------------------------------------------------
// RPC chung và của sinh viên
// ---------------------------------------------------------------------

/** Giờ server (mili giây) */
export async function getServerNow(): Promise<number> {
  const iso = await rpc<string>('server_now');
  return new Date(iso).getTime();
}

export function joinRoom(code: string, name: string): Promise<PlayerCredentials> {
  return rpc<PlayerCredentials>('join_room', { p_code: code, p_name: name });
}

export async function signContract(c: PlayerCredentials): Promise<void> {
  await rpc('sign_contract', { p_player_id: c.player_id, p_token: c.token });
}

/** Gửi 1 áo; trả về số áo server đã ghi nhận (không tăng nếu hết giờ hoặc bấm quá nhanh) */
export function makeShirt(c: PlayerCredentials): Promise<number> {
  return rpc<number>('make_shirt', { p_player_id: c.player_id, p_token: c.token });
}

// ---------------------------------------------------------------------
// RPC của chủ xưởng (cần đăng nhập)
// ---------------------------------------------------------------------

export function createRoom(): Promise<Room> {
  return rpc<Room>('create_room');
}

export async function updateSettings(roomId: string, c: ShiftConfig): Promise<void> {
  await rpc('update_settings', {
    p_room_id: roomId,
    p_duration_sec: c.shiftSeconds,
    p_wage: c.wage,
    p_price: c.price,
    p_material: c.material,
  });
}

export async function startShift(roomId: string): Promise<void> {
  await rpc('start_shift', { p_room_id: roomId });
}

export async function endShift(roomId: string): Promise<void> {
  await rpc('end_shift', { p_room_id: roomId });
}

export async function setStatus(roomId: string, status: 'ended' | 'reveal'): Promise<void> {
  await rpc('set_status', { p_room_id: roomId, p_status: status });
}

export async function setShowTerms(roomId: string, show: boolean): Promise<void> {
  await rpc('set_show_terms', { p_room_id: roomId, p_show: show });
}

export async function resetRoom(roomId: string): Promise<void> {
  await rpc('reset_room', { p_room_id: roomId });
}

/** Người chơi ảo vừa tạo: có token để ký hợp đồng và may áo như sinh viên thật */
export interface BotCredentials {
  player_id: string;
  token: string;
  name: string;
}

/** Thêm người chơi ảo (chỉ ở phòng chờ, tối đa đủ 40 người, tên trùng bị bỏ qua) */
export function addBots(roomId: string, names: string[]): Promise<BotCredentials[]> {
  return rpc<BotCredentials[]>('add_bots', { p_room_id: roomId, p_names: names });
}

/** Xóa mọi người chơi ảo của phòng; trả về số người đã xóa */
export function removeBots(roomId: string): Promise<number> {
  return rpc<number>('remove_bots', { p_room_id: roomId });
}

// ---------------------------------------------------------------------
// Đọc dữ liệu
// ---------------------------------------------------------------------

export async function getPublicRoomByCode(code: string): Promise<PublicRoom | null> {
  const { data, error } = await supabase.from('public_rooms').select('*').eq('code', code).maybeSingle();
  if (error) throw toApiError(error);
  return data as PublicRoom | null;
}

export async function getPublicRoom(roomId: string): Promise<PublicRoom | null> {
  const { data, error } = await supabase.from('public_rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw toApiError(error);
  return data as PublicRoom | null;
}

/** Một người chơi theo id; null nếu đã bị xóa (chủ xưởng bấm "Chơi lại") */
export async function getPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', playerId).maybeSingle();
  if (error) throw toApiError(error);
  return data as Player | null;
}

/** Phòng mới nhất của chủ xưởng đang đăng nhập (RLS chỉ trả phòng của mình) */
export async function getMyLatestRoom(): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toApiError(error);
  return data as Room | null;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw toApiError(error);
  return data as Room | null;
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('shirts', { ascending: false })
    .order('joined_at', { ascending: true });
  if (error) throw toApiError(error);
  return (data ?? []) as Player[];
}

/** Toàn bộ áo của phòng (chỉ chủ xưởng). Tải từng trang 1000 dòng vì Supabase giới hạn mỗi lần đọc. */
export async function listShirts(roomId: string): Promise<ShirtRow[]> {
  const PAGE = 1000;
  const all: ShirtRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('shirts')
      .select('player_id, made_at')
      .eq('room_id', roomId)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw toApiError(error);
    all.push(...((data ?? []) as ShirtRow[]));
    if (!data || data.length < PAGE) return all;
  }
}

/** Gom áo theo người: số giây kể từ đầu ca của từng chiếc */
export function shirtSecondsByPlayer(shirts: ShirtRow[], startedAt: string): Map<string, number[]> {
  const start = new Date(startedAt).getTime();
  const map = new Map<string, number[]>();
  for (const s of shirts) {
    const list = map.get(s.player_id) ?? [];
    list.push((new Date(s.made_at).getTime() - start) / 1000);
    map.set(s.player_id, list);
  }
  return map;
}

/** Đổi cài đặt trong bảng rooms sang dạng dùng trong lib/economics */
export function roomToConfig(r: Pick<Room, 'duration_sec' | 'wage' | 'price' | 'material'>): ShiftConfig {
  return { shiftSeconds: r.duration_sec, wage: r.wage, price: r.price, material: r.material };
}

// ---------------------------------------------------------------------
// Đăng nhập chủ xưởng (Supabase Auth, email + mật khẩu)
// ---------------------------------------------------------------------

export async function signInOwner(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw /invalid login credentials/i.test(error.message)
      ? new ApiError('Sai email hoặc mật khẩu.')
      : toApiError(error);
  }
}

export async function signOutOwner(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isOwnerSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

// ---------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------

type Unsubscribe = () => void;

/**
 * Sinh viên theo dõi trạng thái phòng.
 * Nguồn chính: tin "room_changed" server phát lên kênh "room:<mã>" (xem trigger trong schema.sql).
 * Dự phòng: hỏi lại view public_rooms định kỳ, và mỗi khi điện thoại mở lại màn hình.
 */
export function watchPublicRoom(code: string, onChange: (room: PublicRoom) => void): Unsubscribe {
  let live = false;
  let stopped = false;

  const refresh = () => {
    getPublicRoomByCode(code)
      .then((r) => {
        if (r && !stopped) onChange(r);
      })
      .catch(() => {
        /* lần hỏi sau sẽ thử lại */
      });
  };

  const channel: RealtimeChannel = supabase
    .channel(`room:${code}`)
    .on('broadcast', { event: 'room_changed' }, ({ payload }) => {
      if (!stopped) onChange(payload as PublicRoom);
    })
    .subscribe((status) => {
      live = status === 'SUBSCRIBED';
      if (live) refresh(); // vừa nối lại: lấy trạng thái mới nhất phòng khi lỡ tin
    });

  // Có realtime thì 15 giây hỏi một lần; mất realtime thì 3 giây
  let ticks = 0;
  const poll = window.setInterval(() => {
    ticks++;
    if (!live || ticks % 5 === 0) refresh();
  }, 3000);

  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisible);

  refresh();

  return () => {
    stopped = true;
    window.clearInterval(poll);
    document.removeEventListener('visibilitychange', onVisible);
    supabase.removeChannel(channel);
  };
}

/** Chủ xưởng theo dõi bảng rooms của phòng mình (cần đăng nhập để RLS cho qua). */
export function watchOwnerRoom(roomId: string, onChange: (room: Room) => void): Unsubscribe {
  const channel = supabase
    .channel(`owner-room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onChange(payload.new as Room),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Theo dõi danh sách công nhân của một phòng (phòng chờ, bảng xếp hạng của chủ xưởng).
 * Trả về danh sách đầy đủ mỗi khi có thay đổi.
 *
 * Lưu ý gói Free (giới hạn số tin realtime mỗi giây): trong lúc chạy ca chỉ nên để
 * MÀN CHỦ XƯỞNG nghe bảng players. Điện thoại sinh viên lấy số áo của mình từ make_shirt.
 * Supabase không lọc được sự kiện DELETE theo room_id, nên sau reset_room hãy gọi refresh().
 */
export function watchPlayers(
  roomId: string,
  onChange: (players: Player[]) => void,
): { refresh: () => void; unsubscribe: Unsubscribe } {
  let players: Player[] = [];
  let stopped = false;
  const emit = () => {
    if (!stopped) onChange([...players].sort((a, b) => b.shirts - a.shirts || a.joined_at.localeCompare(b.joined_at)));
  };

  const refresh = () => {
    listPlayers(roomId)
      .then((list) => {
        players = list;
        emit();
      })
      .catch(() => {
        /* giữ danh sách cũ */
      });
  };

  const channel = supabase
    .channel(`players:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as Partial<Player>).id;
          players = players.filter((p) => p.id !== oldId);
        } else {
          const row = payload.new as Player;
          const i = players.findIndex((p) => p.id === row.id);
          players = i === -1 ? [...players, row] : players.map((p) => (p.id === row.id ? row : p));
        }
        emit();
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh();
    });

  refresh();

  return {
    refresh,
    unsubscribe: () => {
      stopped = true;
      supabase.removeChannel(channel);
    },
  };
}
