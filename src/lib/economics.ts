/**
 * Các phép tính kinh tế của trò chơi "Ca làm 3 phút".
 * Tất cả là hàm thuần: cùng đầu vào luôn cho cùng kết quả, không đọc hay ghi gì bên ngoài.
 * Đơn vị tiền: xu. Đơn vị thời gian: giây.
 */

/** Cài đặt một ca làm do chủ xưởng chọn ở phòng chờ. */
export interface ShiftConfig {
  /** Độ dài ca (giây) */
  shiftSeconds: number;
  /** Lương cả ca của mỗi công nhân (xu) */
  wage: number;
  /** Giá bán 1 áo (xu) */
  price: number;
  /** Nguyên liệu cho 1 áo (xu) */
  material: number;
}

/** Cài đặt mặc định, khớp số liệu trong file giao diện mẫu. */
export const DEFAULT_CONFIG: ShiftConfig = { shiftSeconds: 180, wage: 20, price: 10, material: 6 };

/**
 * Giá trị mới mỗi áo = giá bán − nguyên liệu.
 * Nguyên liệu chỉ chuyển nguyên giá trị cũ sang áo; phần chênh lệch do lao động của công nhân tạo thêm.
 */
export function newValuePerShirt(price: number, material: number): number {
  return price - material;
}

/**
 * Số áo cần may để giá trị mới tạo ra đủ bù tiền lương (làm tròn lên).
 * Trả về Infinity nếu áo không tạo ra giá trị mới (giá bán ≤ nguyên liệu).
 */
export function shirtsToCoverWage(wage: number, newValue: number): number {
  if (newValue <= 0) return Infinity;
  return Math.ceil(wage / newValue);
}

/** Giá trị mới một công nhân tạo ra = số áo × giá trị mới mỗi áo. */
export function valueCreated(shirts: number, newValue: number): number {
  return shirts * newValue;
}

/**
 * Giá trị thặng dư = giá trị mới tạo ra − tiền lương.
 * Có thể âm nếu công nhân may quá ít (khi đó chủ xưởng phải bù lương).
 */
export function surplus(created: number, wage: number): number {
  return created - wage;
}

/** Tỷ suất giá trị thặng dư m′ = tổng thặng dư ÷ tổng tiền lương × 100 (%). */
export function surplusRate(totalSurplus: number, totalWage: number): number {
  if (totalWage <= 0) return 0;
  return (totalSurplus / totalWage) * 100;
}

/**
 * Thời điểm (giây kể từ đầu ca) công nhân đã làm ra đủ tiền lương của mình,
 * giả định may đều tay suốt ca. Đây là ranh giới giữa thời gian lao động tất yếu và thặng dư.
 * Trả về null nếu hết ca vẫn chưa làm ra đủ lương.
 */
export function secondsToCoverWage(shirts: number, shiftSeconds: number, wage: number, newValue: number): number | null {
  const created = valueCreated(shirts, newValue);
  if (created <= 0 || created < wage) return null;
  return (shiftSeconds * wage) / created;
}

/**
 * Thời điểm THẬT công nhân làm đủ lương, tính từ dữ liệu từng áo (bảng shirts):
 * là lúc may xong chiếc áo thứ shirtsToCoverWage.
 * shirtSeconds: số giây kể từ đầu ca của từng chiếc áo. Trả về null nếu cả ca chưa đủ lương.
 */
export function actualSecondsToCoverWage(shirtSeconds: number[], wage: number, newValue: number): number | null {
  const need = shirtsToCoverWage(wage, newValue);
  if (!Number.isFinite(need)) return null;
  if (need <= 0) return 0;
  const sorted = [...shirtSeconds].sort((a, b) => a - b);
  return sorted.length >= need ? sorted[need - 1] : null;
}

/** Kiểm tra cài đặt ca; trả về câu báo lỗi, hoặc null nếu hợp lệ. */
export function validateConfig(c: ShiftConfig): string | null {
  const values = [c.shiftSeconds, c.wage, c.price, c.material];
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return 'Mỗi ô cần một số lớn hơn 0.';
  if (newValuePerShirt(c.price, c.material) <= 0) {
    return 'Giá bán phải lớn hơn nguyên liệu, nếu không áo không tạo ra giá trị mới.';
  }
  return null;
}

/** Kết quả của một công nhân sau ca làm. */
export interface WorkerResult {
  name: string;
  shirts: number;
  valueCreated: number;
  wage: number;
  surplus: number;
  secondsToCoverWage: number | null;
}

/** Dữ liệu đầu vào của một công nhân. */
export interface ShiftEntry {
  name: string;
  shirts: number;
  /**
   * Số giây kể từ đầu ca của từng chiếc áo (từ bảng shirts).
   * Có thì "đủ lương sau" tính theo thời điểm thật; không có thì ước tính như thể may đều tay.
   */
  shirtSeconds?: number[];
}

export function workerResult(name: string, shirts: number, c: ShiftConfig, shirtSeconds?: number[]): WorkerResult {
  const nv = newValuePerShirt(c.price, c.material);
  const created = valueCreated(shirts, nv);
  return {
    name,
    shirts,
    valueCreated: created,
    wage: c.wage,
    surplus: surplus(created, c.wage),
    secondsToCoverWage: shirtSeconds
      ? actualSecondsToCoverWage(shirtSeconds, c.wage, nv)
      : secondsToCoverWage(shirts, c.shiftSeconds, c.wage, nv),
  };
}

/** Sổ sách tổng của cả ca, dùng cho màn "Lật sổ sách". */
export interface ShiftSummary {
  workers: WorkerResult[];
  totalShirts: number;
  /** Tiền bán áo, tức giá trị hàng hóa G = c + v + m */
  revenue: number;
  /** Tiền nguyên liệu, tức tư bản bất biến (c) */
  materialCost: number;
  /** Tổng tiền lương, tức tư bản khả biến (v) */
  totalWage: number;
  /** Tổng giá trị mới = v + m */
  totalValueCreated: number;
  /** Tổng giá trị thặng dư (m) */
  totalSurplus: number;
  /** Tỷ suất m′ (%) */
  surplusRate: number;
  /** Trung bình thời điểm làm đủ lương, chỉ tính những người đã làm đủ */
  averageSecondsToCoverWage: number | null;
  most: WorkerResult | null;
  least: WorkerResult | null;
}

export function summarizeShift(entries: ShiftEntry[], c: ShiftConfig): ShiftSummary {
  const workers = entries.map((e) => workerResult(e.name, e.shirts, c, e.shirtSeconds));
  const totalShirts = workers.reduce((s, w) => s + w.shirts, 0);
  const totalWage = workers.reduce((s, w) => s + w.wage, 0);
  const totalValueCreated = workers.reduce((s, w) => s + w.valueCreated, 0);
  const totalSurplus = workers.reduce((s, w) => s + w.surplus, 0);
  const covered = workers.map((w) => w.secondsToCoverWage).filter((t): t is number => t !== null);
  const byShirts = [...workers].sort((a, b) => b.shirts - a.shirts);
  return {
    workers,
    totalShirts,
    revenue: totalShirts * c.price,
    materialCost: totalShirts * c.material,
    totalWage,
    totalValueCreated,
    totalSurplus,
    surplusRate: surplusRate(totalSurplus, totalWage),
    averageSecondsToCoverWage: covered.length ? covered.reduce((s, t) => s + t, 0) / covered.length : null,
    most: byShirts[0] ?? null,
    least: byShirts[byShirts.length - 1] ?? null,
  };
}
