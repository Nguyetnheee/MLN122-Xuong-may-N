import { describe, expect, it } from 'vitest';
import {
  actualSecondsToCoverWage,
  DEFAULT_CONFIG,
  newValuePerShirt,
  secondsToCoverWage,
  shirtsToCoverWage,
  summarizeShift,
  surplus,
  surplusRate,
  validateConfig,
  valueCreated,
  workerResult,
} from './economics';
import { formatNumber, formatXu, mmss } from './format';
import { MOCK_WORKERS } from './mockData';

describe('một công nhân: 15 áo, giá 10, nguyên liệu 6, lương 20', () => {
  const nv = newValuePerShirt(10, 6);

  it('mỗi áo tạo 4 xu giá trị mới', () => {
    expect(nv).toBe(4);
  });

  it('cần 5 áo để đủ lương', () => {
    expect(shirtsToCoverWage(20, nv)).toBe(5);
  });

  it('tạo ra 60 xu, chủ xưởng giữ 40 xu, tỷ suất 200%', () => {
    const created = valueCreated(15, nv);
    expect(created).toBe(60);
    expect(surplus(created, 20)).toBe(40);
    expect(surplusRate(40, 20)).toBe(200);
  });

  it('làm đủ lương sau 1:00 nếu may đều tay trong 3 phút', () => {
    expect(secondsToCoverWage(15, 180, 20, nv)).toBe(60);
  });

  it('workerResult gom đủ các con số', () => {
    expect(workerResult('Tuấn Kiệt', 15, DEFAULT_CONFIG)).toEqual({
      name: 'Tuấn Kiệt',
      shirts: 15,
      valueCreated: 60,
      wage: 20,
      surplus: 40,
      secondsToCoverWage: 60,
    });
  });
});

describe('cả lớp: 30 người, 432 áo', () => {
  const s = summarizeShift(MOCK_WORKERS, DEFAULT_CONFIG);

  it('tổng áo, tiền bán, nguyên liệu, lương', () => {
    expect(s.workers).toHaveLength(30);
    expect(s.totalShirts).toBe(432);
    expect(s.revenue).toBe(4320);
    expect(s.materialCost).toBe(2592);
    expect(s.totalWage).toBe(600);
  });

  it('chủ xưởng dư 1.128 xu, tỷ suất 188%', () => {
    expect(s.totalSurplus).toBe(1128);
    expect(s.revenue - s.materialCost - s.totalWage).toBe(s.totalSurplus); // G − c − v = m
    expect(Math.round(s.surplusRate)).toBe(188);
  });

  it('trung bình làm đủ lương sau 1:07', () => {
    expect(mmss(s.averageSecondsToCoverWage!)).toBe('1:07');
  });

  it('nhiều nhất Minh Anh 24 áo, ít nhất Gia Bảo 7 áo', () => {
    expect(s.most).toMatchObject({ name: 'Minh Anh', shirts: 24 });
    expect(s.least).toMatchObject({ name: 'Gia Bảo', shirts: 7 });
  });
});

describe('trường hợp biên', () => {
  it('làm tròn lên số áo cần may', () => {
    expect(shirtsToCoverWage(20, 3)).toBe(7);
  });

  it('áo không tạo giá trị mới thì không bao giờ đủ lương', () => {
    expect(shirtsToCoverWage(20, 0)).toBe(Infinity);
    expect(secondsToCoverWage(10, 180, 20, 0)).toBeNull();
  });

  it('may quá ít: thặng dư âm, chưa đủ lương', () => {
    const r = workerResult('Ít', 3, DEFAULT_CONFIG);
    expect(r.valueCreated).toBe(12);
    expect(r.surplus).toBe(-8);
    expect(r.secondsToCoverWage).toBeNull();
  });

  it('tỷ suất bằng 0 khi không trả lương', () => {
    expect(surplusRate(100, 0)).toBe(0);
  });

  it('phòng không có ai', () => {
    const s = summarizeShift([], DEFAULT_CONFIG);
    expect(s.totalShirts).toBe(0);
    expect(s.surplusRate).toBe(0);
    expect(s.averageSecondsToCoverWage).toBeNull();
    expect(s.most).toBeNull();
  });
});

describe('thời điểm đủ lương từ dữ liệu từng áo (bảng shirts)', () => {
  it('là lúc may xong chiếc áo thứ 5, kể cả khi dữ liệu chưa sắp xếp', () => {
    expect(actualSecondsToCoverWage([30, 10, 50, 20, 40, 60], 20, 4)).toBe(50);
  });

  it('chưa đủ 5 áo thì trả null', () => {
    expect(actualSecondsToCoverWage([10, 20, 30, 40], 20, 4)).toBeNull();
  });

  it('summarizeShift dùng thời điểm thật khi có shirtSeconds', () => {
    const s = summarizeShift(
      [
        { name: 'A', shirts: 6, shirtSeconds: [5, 10, 15, 20, 25, 170] },
        { name: 'B', shirts: 2, shirtSeconds: [50, 100] },
      ],
      DEFAULT_CONFIG,
    );
    expect(s.workers[0].secondsToCoverWage).toBe(25);
    expect(s.workers[1].secondsToCoverWage).toBeNull();
    expect(s.averageSecondsToCoverWage).toBe(25); // chỉ tính người đã đủ lương
  });
});

describe('kiểm tra cài đặt ca', () => {
  it('mặc định hợp lệ', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toBeNull();
  });

  it('giá bán phải lớn hơn nguyên liệu', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, price: 6 })).toMatch(/Giá bán phải lớn hơn/);
  });

  it('không nhận ô trống hoặc số ≤ 0', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, wage: NaN })).not.toBeNull();
    expect(validateConfig({ ...DEFAULT_CONFIG, shiftSeconds: 0 })).not.toBeNull();
  });
});

describe('định dạng số', () => {
  it('kiểu Việt Nam', () => {
    expect(formatNumber(4320)).toBe('4.320');
    expect(formatXu(1128)).toBe('1.128 xu');
    expect(formatXu(-600)).toBe('− 600 xu');
    expect(mmss(65)).toBe('1:05');
  });
});
