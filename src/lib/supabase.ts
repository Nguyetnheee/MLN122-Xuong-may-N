import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** false khi chưa có file .env: app vẫn chạy được bằng dữ liệu giả. */
export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('Chưa cấu hình Supabase: tạo file .env theo mẫu .env.example.');
}

/**
 * Client Supabase dùng chung cho cả app.
 * Chỉ chủ xưởng đăng nhập (phiên được nhớ trong trình duyệt); sinh viên dùng khóa anon.
 */
export const supabase = createClient(url || 'http://localhost:54321', key || 'chua-cau-hinh', {
  auth: { persistSession: true, autoRefreshToken: true },
});
