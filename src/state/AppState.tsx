import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PlayerCredentials } from '../lib/api';

/**
 * Phiên của sinh viên trên điện thoại, lưu trong localStorage để tải lại trang
 * (hoặc khóa màn hình rồi mở lại) vẫn giữ được chỗ trong phòng.
 */
export interface StudentSession {
  /** Mã phòng 4 số */
  room: string;
  name: string;
  /** Nhận từ join_room; null = chưa vào phòng nào */
  credentials: PlayerCredentials | null;
}

const STUDENT_KEY = 'ca-lam:sinh-vien';
const EMPTY_STUDENT: StudentSession = { room: '', name: '', credentials: null };

function readStore(): StudentSession {
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    return raw ? { ...EMPTY_STUDENT, ...JSON.parse(raw) } : EMPTY_STUDENT;
  } catch {
    return EMPTY_STUDENT;
  }
}

function writeStore(value: StudentSession) {
  try {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(value));
  } catch {
    /* Trình duyệt chặn lưu: vẫn chơi được, chỉ không nhớ khi tải lại trang */
  }
}

interface AppState {
  student: StudentSession;
  updateStudent: (patch: Partial<StudentSession>) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState(readStore);

  const updateStudent = useCallback((patch: Partial<StudentSession>) => {
    setStudent((prev) => {
      const next = { ...prev, ...patch };
      writeStore(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ student, updateStudent }), [student, updateStudent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState phải nằm trong AppStateProvider');
  return v;
}
