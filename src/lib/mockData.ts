/** Tên xưởng hiển thị trên hợp đồng, phiếu lương và header chủ xưởng. */
export const FACTORY_NAME = 'Tập đoàn may mặc N';

const RAW: [string, number][] = [
  ['Minh Anh', 24], ['Gia Huy', 22], ['Thảo Vy', 21], ['Quốc Bảo', 19], ['Ngọc Hân', 18],
  ['Đức Trí', 17], ['Khánh Linh', 17], ['Hoàng Nam', 16], ['Phương Uyên', 16], ['Tuấn Kiệt', 15],
  ['Bảo Ngọc', 15], ['Thành Đạt', 15], ['Mai Chi', 15], ['Nhật Minh', 14], ['Hà My', 14],
  ['Anh Khoa', 14], ['Thu Trang', 14], ['Việt Hoàng', 13], ['Diệu Linh', 13], ['Trọng Phúc', 13],
  ['Yến Nhi', 13], ['Công Danh', 12], ['Lan Anh', 12], ['Hải Đăng', 12], ['Quỳnh Như', 11],
  ['Minh Quân', 11], ['Tường Vi', 10], ['Đăng Khôi', 10], ['Hồng Nhung', 9], ['Gia Bảo', 7],
];

/**
 * 30 công nhân, tổng 432 áo: số liệu của file giao diện mẫu.
 * Dùng cho unit test và làm tên người chơi ảo ở trang Thử tải.
 */
export const MOCK_WORKERS = RAW.map(([name, shirts]) => ({ name, shirts }));
