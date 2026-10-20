# Ca làm 3 phút

Trò chơi lớp học mở đầu cho bài **Giá trị thặng dư**, môn Kinh tế chính trị Mác - Lênin (MLN122).

Sinh viên vào phòng bằng điện thoại, ký "hợp đồng lao động" lương 20 xu rồi may áo trong 3 phút.
Hết ca, chủ xưởng (giảng viên/nhóm thuyết trình) lật sổ sách trên máy chiếu: ai cũng nhận 20 xu,
nhưng phần giá trị mới các bạn tạo ra vượt xa tiền lương. Đó là giá trị thặng dư (m), tỷ suất m′ = m ÷ v.

- Giao diện: Vite + React + TypeScript, CSS thuần (màu và font theo `docs/giao-dien-mau.html`).
- Dữ liệu và realtime: Supabase (gói Free).
- Mọi phép tính kinh tế nằm trong `src/lib/economics.ts`, có unit test.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
cp .env.example .env      # rồi điền 2 biến ở mục bên dưới
npm run dev               # mở http://localhost:5173
```

Muốn mở bằng điện thoại cùng mạng Wi-Fi: `npm run dev -- --host`, rồi vào địa chỉ `Network` mà Vite in ra
(ví dụ `http://192.168.1.50:5173`). Nếu điện thoại không vào được, cho phép Node.js qua Windows Firewall (mạng Private).

Các lệnh khác:

| Lệnh | Việc |
| --- | --- |
| `npm test` | Chạy unit test (Vitest) |
| `npm run build` | Kiểm tra kiểu TypeScript và đóng gói vào `dist/` |
| `npm run preview` | Chạy thử bản đã đóng gói |

## Biến môi trường

| Biến | Lấy ở đâu |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → **Project Settings → Data API** → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API Keys** → khóa `anon` / `publishable` |

Khóa anon/publishable được phép nằm trong code chạy trên trình duyệt: quyền thật sự do RLS và các hàm
trong `supabase/schema.sql` kiểm soát. **Không bao giờ** dùng khóa `service_role` / `secret`.

File `.env` đã nằm trong `.gitignore`, đừng commit nó.

## Cài đặt Supabase (làm một lần)

1. **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql`, bấm **Run**.
   File chạy lại nhiều lần vẫn an toàn; mỗi khi file này được cập nhật thì dán và chạy lại.
   Nếu Supabase hỏi xác nhận vì có lệnh `drop policy`/`drop trigger`, chọn **Run this query**.
2. **Authentication → Users → Add user → Create new user**: tạo tài khoản chủ xưởng (email + mật khẩu),
   tích **Auto Confirm User**. App không có trang đăng ký.
3. **Authentication → Sign In / Providers**: tắt **Allow new users to sign up** để người lạ không tự tạo tài khoản.
4. **Realtime → Settings**: nếu có tùy chọn chỉ cho phép kênh private thì để **tắt**
   (điện thoại sinh viên nghe kênh công khai `room:<mã>`).

## Đưa lên Vercel

1. Đẩy code lên GitHub (không kèm `.env`).
2. Trên Vercel: **Add New → Project**, chọn repo. Vercel tự nhận ra Vite
   (Build Command `npm run build`, Output Directory `dist`).
3. **Settings → Environment Variables**: thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`
   cho cả Production và Preview.
4. Bấm **Deploy**. Nếu thêm hoặc đổi biến môi trường sau khi đã deploy, phải **Redeploy**
   (biến `VITE_*` được gắn vào lúc build).
5. Mở `https://<tên-dự-án>.vercel.app/admin`, đăng nhập, thử tải lại trang ở `/admin` hoặc `/may-ao`:
   `vercel.json` chuyển mọi đường dẫn về `index.html` nên không bị lỗi 404.

## Các màn hình

| Đường dẫn | Ai dùng | Nội dung |
| --- | --- | --- |
| `/` | Sinh viên | Vào phòng (mã 4 số + tên). Quét QR sẽ mở `/?room=<mã>` và điền sẵn mã |
| `/hop-dong` | Sinh viên | Hợp đồng lao động, ký |
| `/may-ao` | Sinh viên | Màn chơi: bấm 4 bước đúng thứ tự để may 1 áo |
| `/phieu-luong` | Sinh viên | Phiếu lương, xếp hạng |
| `/lat-bai` | Sinh viên | Vòng 2: 3 phút của bạn đã đi đâu |
| `/admin/dang-nhap` | Chủ xưởng | Đăng nhập |
| `/admin` | Chủ xưởng | Phòng chờ: mã phòng, QR, danh sách công nhân, cài đặt ca |
| `/admin/dang-chay` | Chủ xưởng | Đồng hồ, bảng xếp hạng, sổ sách (có chế độ chiếu ẩn sổ sách) |
| `/admin/so-sach` | Chủ xưởng | Lật sổ sách, tên gọi theo Mác, xuất CSV, chơi lại |
| `/admin/thu-tai` | Chủ xưởng | Tạo 30 người chơi ảo để tập dượt |

Điện thoại sinh viên tự chuyển màn theo trạng thái phòng do chủ xưởng điều khiển
(phòng chờ → may áo → phiếu lương → Vòng 2). Tải lại trang vẫn giữ chỗ trong phòng.

## Tập dượt khi không đủ người

1. Ở Phòng chờ bấm **Thử tải → Tạo 30 người chơi ảo**.
2. Về Phòng chờ, đợi họ chuyển sang "đã ký", bấm **Bắt đầu ca**.
3. Người ảo tự may áo với tốc độ khác nhau (khoảng 7–24 áo mỗi 3 phút) cho tới hết ca.
   Họ chạy trong trình duyệt của chủ xưởng, nên **giữ tab chủ xưởng mở** suốt ca.
4. Xong thì bấm **Xóa người ảo** (chỉ xóa người ảo, giữ sinh viên thật) hoặc **Chơi lại**.

Người ảo có tên kèm "(ảo)" và gọi đúng các hàm server như sinh viên thật, nên cũng đi qua mọi
kiểm tra (đã ký hợp đồng, còn giờ, không quá 1 áo mỗi 0,8 giây).

## Cấu trúc thư mục

```
supabase/
  schema.sql          Bảng, view, RLS, hàm RPC, realtime: dán vào SQL Editor
  test-bots.sql       Lệnh SQL tạo công nhân giả bằng tay (cách cũ, trước khi có /admin/thu-tai)
src/
  lib/economics.ts    Mọi phép tính kinh tế (hàm thuần) + economics.test.ts
  lib/api.ts          Hàm gọi Supabase có kiểu
  lib/bots.ts         Người chơi ảo
  lib/useServerClock.ts  Đồng hồ hiệu chỉnh theo giờ server
  state/              Trạng thái sinh viên (cục bộ), phòng của chủ xưởng
  components/         PhoneScreen, AdminLayout, LedgerLines, TimeSplitBar, StatTile, ShirtIcon
  pages/student/      5 màn sinh viên
  pages/admin/        5 màn chủ xưởng
  styles/             tokens.css (biến màu), base.css
```

## Bảo mật tóm tắt

- Client không ghi thẳng vào bảng nào; mọi thay đổi đi qua hàm RPC kiểm tra quyền ở server.
- Sinh viên không đọc được bảng `rooms`; họ đọc view `public_rooms`, trong đó **giá bán và nguyên liệu
  là `null` cho tới Vòng 2**.
- Mỗi sinh viên có một `token` bí mật khi vào phòng; không có token thì không ký hay may áo hộ người khác được.
- Chỉ chủ phòng đọc được bảng `shirts` và gọi các hàm điều khiển ca.
