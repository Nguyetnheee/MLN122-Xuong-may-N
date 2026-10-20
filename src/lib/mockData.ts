/** Dữ liệu giả lấy đúng từ file giao diện mẫu, dùng khi chưa nối backend. */

export const FACTORY_NAME = 'Xưởng May ABC';
export const MOCK_ROOM = '4827';
export const MOCK_PLAYER_NAME = 'Tuấn Kiệt';
/** Số áo của "bạn" khi chưa chơi màn may áo */
export const MOCK_PLAYER_SHIRTS = 15;

const RAW: [string, number][] = [
  ['Minh Anh', 24], ['Gia Huy', 22], ['Thảo Vy', 21], ['Quốc Bảo', 19], ['Ngọc Hân', 18],
  ['Đức Trí', 17], ['Khánh Linh', 17], ['Hoàng Nam', 16], ['Phương Uyên', 16], ['Tuấn Kiệt', 15],
  ['Bảo Ngọc', 15], ['Thành Đạt', 15], ['Mai Chi', 15], ['Nhật Minh', 14], ['Hà My', 14],
  ['Anh Khoa', 14], ['Thu Trang', 14], ['Việt Hoàng', 13], ['Diệu Linh', 13], ['Trọng Phúc', 13],
  ['Yến Nhi', 13], ['Công Danh', 12], ['Lan Anh', 12], ['Hải Đăng', 12], ['Quỳnh Như', 11],
  ['Minh Quân', 11], ['Tường Vi', 10], ['Đăng Khôi', 10], ['Hồng Nhung', 9], ['Gia Bảo', 7],
];

/** 30 công nhân, tổng 432 áo */
export const MOCK_WORKERS = RAW.map(([name, shirts]) => ({ name, shirts }));

/** Bạn cùng lớp (bỏ "bạn" ra) để xếp hạng trên phiếu lương */
export const MOCK_CLASSMATES = MOCK_WORKERS.filter((w) => w.name !== MOCK_PLAYER_NAME);

const STILL_READING = ['Quỳnh Như', 'Minh Quân', 'Tường Vi'];

/** Phòng chờ: 27 người đã vào, 3 người còn đang đọc hợp đồng */
export const MOCK_LOBBY_PLAYERS = MOCK_WORKERS.slice(0, 27).map((w) => ({
  name: w.name,
  signed: !STILL_READING.includes(w.name),
}));
