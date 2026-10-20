import { useCallback, useEffect, useState } from 'react';
import { getServerNow } from './api';
import { isSupabaseConfigured } from './supabase';

/**
 * Độ lệch giữa đồng hồ server và đồng hồ máy (mili giây): giờ thật = Date.now() + offset.
 * Chỉ đo một lần cho cả trang, mọi component dùng chung kết quả.
 */
let offsetPromise: Promise<number> | null = null;
let measuredOffset: number | null = null;

function measureOffset(): Promise<number> {
  if (!offsetPromise) {
    offsetPromise = (async () => {
      if (!isSupabaseConfigured) return 0;
      try {
        const sent = Date.now();
        const server = await getServerNow();
        const received = Date.now();
        // Giả định thời gian đi và về bằng nhau: server trả lời ở giữa chuyến
        const offset = server - (sent + received) / 2;
        measuredOffset = offset;
        return offset;
      } catch {
        offsetPromise = null; // lần mở trang sau thử lại; tạm dùng giờ máy
        return 0;
      }
    })();
  }
  return offsetPromise;
}

/** Giờ server (mili giây) cho code ngoài React; trước khi đo xong thì dùng giờ máy. */
export function serverNow(): number {
  void measureOffset();
  return Date.now() + (measuredOffset ?? 0);
}

/**
 * Đồng hồ đã hiệu chỉnh theo server. Gọi server_now() một lần khi mở trang.
 * - now(): giờ hiện tại theo server (mili giây)
 * - ready: đã đo xong độ lệch (trước đó now() tạm dùng giờ máy)
 */
export function useServerClock() {
  const [offsetMs, setOffsetMs] = useState<number | null>(measuredOffset);

  useEffect(() => {
    let alive = true;
    measureOffset().then((o) => {
      if (alive) setOffsetMs(o);
    });
    return () => {
      alive = false;
    };
  }, []);

  const now = useCallback(() => Date.now() + (offsetMs ?? 0), [offsetMs]);
  return { now, offsetMs: offsetMs ?? 0, ready: offsetMs !== null };
}

/** Số giây còn lại (làm tròn lên, không âm) tính tới mốc endsAt. */
export function secondsLeft(endsAt: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - nowMs) / 1000));
}

/**
 * Đếm ngược tới ends_at của phòng, theo giờ server đã hiệu chỉnh.
 * Trả về null khi chưa có ends_at (ca chưa bắt đầu).
 */
export function useCountdown(endsAt: string | null | undefined, intervalMs = 250): number | null {
  const { now } = useServerClock();
  const [left, setLeft] = useState<number | null>(() => (endsAt ? secondsLeft(endsAt, now()) : null));

  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(secondsLeft(endsAt, now()));
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [endsAt, now, intervalMs]);

  return left;
}
