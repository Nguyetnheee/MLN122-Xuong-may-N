import type { ShirtPart } from '../lib/game';

const SHIRT_PATH = 'M10 4 L4 8 L6 13 L8 12 L8 24 L20 24 L20 12 L22 13 L24 8 L18 4 C17 6 15.5 7 14 7 C12.5 7 11 6 10 4 Z';

interface ShirtIconProps {
  size?: number;
  /** outline: nét theo màu chữ (logo); filled: áo nhỏ xanh nhạt trên màn may áo */
  variant?: 'outline' | 'filled';
  className?: string;
}

export function ShirtIcon({ size = 28, variant = 'outline', className }: ShirtIconProps) {
  const filled = variant === 'filled';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill={filled ? 'var(--shirt-fill)' : 'none'}
      stroke={filled ? 'var(--leaf)' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={SHIRT_PATH} />
    </svg>
  );
}

const PART_PATHS: Record<ShirtPart, string> = {
  co: 'M9 6 C10.5 9 12 10 14 10 C16 10 17.5 9 19 6 M9 6 L19 6',
  trai: 'M18 6 L8 10 L5 18 L10 20 L12 14',
  phai: 'M10 6 L20 10 L23 18 L18 20 L16 14',
  than: 'M8 6 L20 6 L20 24 L8 24 Z',
};

/** Hình nhỏ cho từng bộ phận áo trên 4 nút may */
export function ShirtPartIcon({ part, size = 30 }: { part: ShirtPart; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="var(--green)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PART_PATHS[part]} />
    </svg>
  );
}
