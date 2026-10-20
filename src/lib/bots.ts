/**
 * Người chơi ảo cho trang /admin/thu-tai.
 * Các bot chạy ngay trong trình duyệt của chủ xưởng và gọi đúng các RPC mà điện thoại
 * sinh viên dùng (sign_contract, make_shirt), nên server kiểm tra chúng như người thật.
 * Bot chỉ hoạt động khi còn mở một trang chủ xưởng bất kỳ trong tab đó.
 */
import { addBots, removeBots, makeShirt, signContract, type BotCredentials, type RoomStatus } from './api';
import { serverNow } from './useServerClock';

interface Bot extends BotCredentials {
  signed: boolean;
  /** Lúc bot "đọc xong" hợp đồng và ký (mili giây, giờ server) */
  signAt: number;
  /** Tay nghề: số áo may được nếu ca dài 3 phút (7–24, giống dữ liệu mẫu) */
  skill: number;
  /** Lúc bot bấm xong chiếc áo tiếp theo; null khi không trong ca */
  nextAt: number | null;
  busy: boolean;
}

export interface BotRoom {
  id: string;
  status: RoomStatus;
  started_at: string | null;
  ends_at: string | null;
  duration_sec: number;
}

export interface BotSnapshot {
  /** Số bot tab này đang điều khiển */
  count: number;
  signed: number;
  /** Số lần gửi áo thành công từ khi mở trang */
  sent: number;
  errors: number;
  lastError: string | null;
}

/** Tên người chơi ảo: lấy tên trong dữ liệu mẫu, gắn "(ảo)" để không lẫn với sinh viên thật */
export const BOT_SUFFIX = ' (ảo)';

const storeKey = (roomId: string) => `ca-lam:nguoi-ao:${roomId}`;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

class BotEngine {
  private bots: Bot[] = [];
  private room: BotRoom | null = null;
  private timer: number | undefined;
  private sent = 0;
  private errors = 0;
  private lastError: string | null = null;
  private listeners = new Set<() => void>();
  private snapshot: BotSnapshot = { count: 0, signed: 0, sent: 0, errors: 0, lastError: null };

  /** Gọi mỗi khi phòng của chủ xưởng thay đổi */
  attach(room: BotRoom) {
    if (room.id !== this.room?.id) this.bots = this.load(room.id);
    if (room.status !== 'playing') this.bots.forEach((b) => (b.nextAt = null));
    this.room = room;
    if (this.timer === undefined) this.timer = window.setInterval(() => this.tick(), 250);
    this.emit();
  }

  detach() {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.room = null;
  }

  async add(roomId: string, names: string[]) {
    const created = await addBots(roomId, names);
    const now = serverNow();
    for (const c of created) {
      this.bots.push({ ...c, signed: false, signAt: now + rand(1000, 8000), skill: rand(7, 24), nextAt: null, busy: false });
    }
    this.save(roomId);
    this.emit();
    return created.length;
  }

  async removeAll(roomId: string) {
    const n = await removeBots(roomId);
    this.forget(roomId);
    return n;
  }

  /** Quên các bot (ví dụ sau "Chơi lại": server đã xóa họ) */
  forget(roomId: string) {
    this.bots = [];
    this.save(roomId);
    this.emit();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.snapshot;

  private tick() {
    const room = this.room;
    if (!room || this.bots.length === 0) return;
    const now = serverNow();

    for (const b of this.bots) {
      if (b.busy) continue;
      const cred = { player_id: b.player_id, token: b.token, room_id: room.id };

      if (!b.signed && room.status === 'lobby' && now >= b.signAt) {
        b.busy = true;
        signContract(cred)
          .then(() => {
            b.signed = true;
            this.save(room.id);
          })
          .catch((e: Error) => this.fail(b, e))
          .finally(() => this.done(b));
        continue;
      }

      if (room.status !== 'playing' || !b.signed || !room.started_at || !room.ends_at) continue;
      const start = Date.parse(room.started_at);
      const end = Date.parse(room.ends_at);
      const gap = (room.duration_sec * 1000) / b.skill;
      if (b.nextAt === null) b.nextAt = Math.max(now, start) + gap * rand(0.6, 1.4);
      if (now < b.nextAt || now >= end) continue;

      b.nextAt = now + Math.max(900, gap * rand(0.6, 1.4)); // server bỏ qua áo cách nhau < 0,8 giây
      b.busy = true;
      makeShirt(cred)
        .then(() => this.sent++)
        .catch((e: Error) => this.fail(b, e))
        .finally(() => this.done(b));
    }
  }

  private done(b: Bot) {
    b.busy = false;
    this.emit();
  }

  private fail(b: Bot, e: Error) {
    this.errors++;
    this.lastError = e.message;
    // Bot đã bị xóa trên server (Chơi lại, xóa ở tab khác): bỏ khỏi danh sách
    if (/Phiên chơi không hợp lệ/.test(e.message) && this.room) {
      this.bots = this.bots.filter((x) => x !== b);
      this.save(this.room.id);
    }
  }

  private emit() {
    this.snapshot = {
      count: this.bots.length,
      signed: this.bots.filter((b) => b.signed).length,
      sent: this.sent,
      errors: this.errors,
      lastError: this.lastError,
    };
    this.listeners.forEach((fn) => fn());
  }

  private load(roomId: string): Bot[] {
    try {
      const raw = localStorage.getItem(storeKey(roomId));
      const list = raw ? (JSON.parse(raw) as Bot[]) : [];
      return list.map((b) => ({ ...b, busy: false, nextAt: null }));
    } catch {
      return [];
    }
  }

  private save(roomId: string) {
    try {
      localStorage.setItem(storeKey(roomId), JSON.stringify(this.bots));
    } catch {
      /* không lưu được thì bot chỉ sống tới khi tải lại trang */
    }
  }
}

export const botEngine = new BotEngine();
