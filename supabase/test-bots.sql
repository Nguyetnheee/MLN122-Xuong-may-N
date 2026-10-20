-- =====================================================================
-- Công nhân giả để thử màn chủ xưởng khi các màn sinh viên chưa nối Supabase.
-- Chạy TỪNG KHỐI trong Supabase > SQL Editor (bôi đen khối rồi bấm Run).
-- Nhớ đổi '1234' thành mã phòng đang hiện trên màn Phòng chờ.
-- =====================================================================

-- Khối 1 (khi phòng đang ở Phòng chờ): 8 bạn vào phòng, 6 bạn ký hợp đồng, 2 bạn "đang đọc"
select public.sign_contract((j ->> 'player_id')::uuid, (j ->> 'token')::uuid)
from (select public.join_room('1234', 'Bot ' || g) as j from generate_series(1, 6) as g) as t;

select public.join_room('1234', 'Bot đang đọc ' || g) from generate_series(1, 2) as g;


-- Khối 2 (sau khi bấm "Bắt đầu ca"): mỗi lần Run, mỗi bot đã ký may thêm 1 áo.
-- Bấm Run nhiều lần (cách nhau hơn 1 giây) để xem bảng xếp hạng và sổ sách nhảy số.
-- random() < 0.7: mỗi lần chỉ khoảng 70% số bot may được, để số áo chênh nhau.
select p.name, public.make_shirt(p.id, s.token) as so_ao
from public.players p
join public.player_secrets s on s.player_id = p.id
join public.rooms r on r.id = p.room_id
where r.code = '1234' and p.signed and random() < 0.7;
