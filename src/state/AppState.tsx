import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIG, type ShiftConfig } from '../lib/economics';

/** Trạng thái cục bộ (chưa có backend), lưu tạm trong sessionStorage của trình duyệt. */
export interface StudentSession {
  room: string;
  name: string;
  signed: boolean;
  /** null = chưa chơi màn may áo */
  shirts: number | null;
}

const STUDENT_KEY = 'ca-lam:sinh-vien';
const CONFIG_KEY = 'ca-lam:cai-dat';
const EMPTY_STUDENT: StudentSession = { room: '', name: '', signed: false, shirts: null };

function readStore<T extends object>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Trình duyệt chặn lưu: vẫn chơi được, chỉ không nhớ khi tải lại trang */
  }
}

interface AppState {
  student: StudentSession;
  updateStudent: (patch: Partial<StudentSession>) => void;
  config: ShiftConfig;
  setConfig: (c: ShiftConfig) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState(() => readStore(STUDENT_KEY, EMPTY_STUDENT));
  const [config, setConfigState] = useState(() => readStore(CONFIG_KEY, DEFAULT_CONFIG));

  const updateStudent = useCallback((patch: Partial<StudentSession>) => {
    setStudent((prev) => {
      const next = { ...prev, ...patch };
      writeStore(STUDENT_KEY, next);
      return next;
    });
  }, []);

  const setConfig = useCallback((c: ShiftConfig) => {
    writeStore(CONFIG_KEY, c);
    setConfigState(c);
  }, []);

  const value = useMemo(
    () => ({ student, updateStudent, config, setConfig }),
    [student, updateStudent, config, setConfig],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState phải nằm trong AppStateProvider');
  return v;
}
