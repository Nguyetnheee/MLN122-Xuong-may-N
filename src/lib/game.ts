/** Luật chơi của màn may áo: 4 bước, thứ tự ngẫu nhiên cho mỗi chiếc. */
export type ShirtPart = 'co' | 'trai' | 'phai' | 'than';

export const SHIRT_PARTS: ShirtPart[] = ['co', 'trai', 'phai', 'than'];

export const PART_NAMES: Record<ShirtPart, string> = {
  co: 'Cổ áo',
  trai: 'Tay trái',
  phai: 'Tay phải',
  than: 'Thân áo',
};

/** Trộn thứ tự 4 bước (Fisher–Yates). */
export function shuffledParts(random: () => number = Math.random): ShirtPart[] {
  const a = [...SHIRT_PARTS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Xếp hạng theo số áo: hạng = 1 + số người may nhiều hơn (bằng nhau thì cùng hạng). */
export function rankByShirts(own: number, others: number[]): number {
  return 1 + others.filter((n) => n > own).length;
}
