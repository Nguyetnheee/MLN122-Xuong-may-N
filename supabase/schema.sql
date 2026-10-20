-- =====================================================================
-- Ca làm 3 phút — cơ sở dữ liệu Supabase
-- Dán toàn bộ file này vào Supabase > SQL Editor > New query > Run.
-- Chạy lại nhiều lần vẫn an toàn (không xóa dữ liệu đang có).
--
-- Nguyên tắc:
--   * Client (trình duyệt) KHÔNG được ghi thẳng vào bảng. Mọi thay đổi đi qua
--     các hàm RPC "security definer" bên dưới; điều kiện được kiểm tra ở server.
--   * Sinh viên không đăng nhập. Khi vào phòng, mỗi người nhận player_id + token
--     bí mật; các hàm của sinh viên đòi cả hai (player_id thì ai cũng đọc được).
--   * Giá bán và nguyên liệu được giấu khỏi sinh viên cho tới Vòng 2 ('reveal').
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. BẢNG
-- ---------------------------------------------------------------------

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[0-9]{4}$'),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status        text not null default 'lobby' check (status in ('lobby', 'playing', 'ended', 'reveal')),
  duration_sec  int  not null default 180 check (duration_sec between 10 and 3600),
  wage          int  not null default 20  check (wage > 0),
  price         int  not null default 10  check (price > 0),
  material      int  not null default 6   check (material > 0),
  started_at    timestamptz,
  ends_at       timestamptz,
  show_terms    boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint rooms_price_gt_material check (price > material)
);

create index if not exists rooms_owner_idx on public.rooms (owner_id, created_at desc);

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 30),
  signed     boolean not null default false,
  shirts     int not null default 0 check (shirts >= 0),
  joined_at  timestamptz not null default now()
);

create index if not exists players_room_idx on public.players (room_id);
-- Không cho hai người trùng tên trong một phòng (bảng xếp hạng dễ đọc, tránh vào hai lần)
create unique index if not exists players_room_name_uniq on public.players (room_id, lower(name));

-- Mã bí mật của từng người chơi. Không ai đọc được bảng này từ client.
create table if not exists public.player_secrets (
  player_id  uuid primary key references public.players (id) on delete cascade,
  token      uuid not null default gen_random_uuid()
);

-- Mỗi áo một dòng: biết chính xác thời điểm từng người làm đủ lương
create table if not exists public.shirts (
  id         bigserial primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  made_at    timestamptz not null default now()
);

create index if not exists shirts_room_idx on public.shirts (room_id, made_at);
create index if not exists shirts_player_idx on public.shirts (player_id, made_at desc);


-- ---------------------------------------------------------------------
-- 2. VIEW CHO SINH VIÊN: giấu giá bán và nguyên liệu trước Vòng 2
-- ---------------------------------------------------------------------
-- View này CỐ Ý chạy với quyền của chủ view (security_invoker = false) để sinh viên
-- đọc được trạng thái phòng dù không có quyền đọc bảng rooms. Chỉ các cột an toàn được lộ ra.
-- (Trình kiểm tra bảo mật của Supabase có thể cảnh báo "Security Definer View": đó là chủ ý.)

create or replace view public.public_rooms
with (security_invoker = false) as
select
  id,
  code,
  status,
  duration_sec,
  wage,
  started_at,
  ends_at,
  show_terms,
  case when status = 'reveal' then price end    as price,
  case when status = 'reveal' then material end as material
from public.rooms;


-- ---------------------------------------------------------------------
-- 3. RLS VÀ QUYỀN TRÊN BẢNG
-- ---------------------------------------------------------------------

alter table public.rooms          enable row level security;
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.shirts         enable row level security;

-- Không ai ghi thẳng vào bảng từ client; chỉ qua RPC.
revoke insert, update, delete, truncate on public.rooms, public.players, public.shirts from anon, authenticated;
revoke all on public.player_secrets from anon, authenticated;
revoke all on public.rooms, public.shirts from anon;
revoke all on public.public_rooms from anon, authenticated;
grant select on public.public_rooms to anon, authenticated;
grant select on public.players to anon, authenticated;
grant select on public.rooms, public.shirts to authenticated;

-- rooms: bảng đầy đủ (có giá bán, nguyên liệu) chỉ chủ phòng đọc được
drop policy if exists "Chủ phòng đọc phòng của mình" on public.rooms;
create policy "Chủ phòng đọc phòng của mình" on public.rooms
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- players: ai cũng đọc được (trạng thái phòng chờ, bảng xếp hạng)
drop policy if exists "Ai cũng đọc được danh sách công nhân" on public.players;
create policy "Ai cũng đọc được danh sách công nhân" on public.players
  for select to anon, authenticated
  using (true);

-- shirts: chỉ chủ phòng đọc được
drop policy if exists "Chủ phòng đọc áo của phòng mình" on public.shirts;
create policy "Chủ phòng đọc áo của phòng mình" on public.shirts
  for select to authenticated
  using (exists (
    select 1 from public.rooms r
    where r.id = shirts.room_id and r.owner_id = (select auth.uid())
  ));

-- player_secrets: bật RLS và không có policy nào = không ai đọc được từ client


-- ---------------------------------------------------------------------
-- 4. HÀM NỘI BỘ (không gọi được từ client)
-- ---------------------------------------------------------------------

-- Báo lỗi nếu người đang đăng nhập không phải chủ phòng
create or replace function public._assert_owner(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập chủ xưởng.';
  end if;
  if not exists (select 1 from public.rooms where id = p_room_id and owner_id = auth.uid()) then
    raise exception 'Chỉ chủ xưởng của phòng này mới làm được việc này.';
  end if;
end;
$$;

-- Báo lỗi nếu player_id và token không khớp
create or replace function public._assert_player(p_player_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.player_secrets
    where player_id = p_player_id and token = p_token
  ) then
    raise exception 'Phiên chơi không hợp lệ. Hãy vào phòng lại.';
  end if;
end;
$$;

revoke execute on function public._assert_owner(uuid) from public, anon, authenticated;
revoke execute on function public._assert_player(uuid, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. RPC CHO MỌI NGƯỜI
-- ---------------------------------------------------------------------

-- Giờ của server, để client hiệu chỉnh đồng hồ đếm ngược
create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

-- Sinh viên vào phòng. Trả về { player_id, token, room_id }.
create or replace function public.join_room(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room   public.rooms%rowtype;
  v_name   text := btrim(coalesce(p_name, ''));
  v_count  int;
  v_player uuid;
  v_token  uuid;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'Tên cần từ 1 đến 30 ký tự.';
  end if;

  -- Khóa dòng phòng để đếm số người chính xác khi nhiều bạn vào cùng lúc
  select * into v_room from public.rooms where code = btrim(coalesce(p_code, '')) for update;
  if not found then
    raise exception 'Không tìm thấy phòng %.', btrim(coalesce(p_code, ''));
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'Ca làm đã bắt đầu, phòng không nhận thêm người.';
  end if;

  select count(*) into v_count from public.players where room_id = v_room.id;
  if v_count >= 40 then
    raise exception 'Phòng đã đủ 40 người.';
  end if;

  begin
    insert into public.players (room_id, name) values (v_room.id, v_name) returning id into v_player;
  exception when unique_violation then
    raise exception 'Tên "%" đã có trong phòng. Thêm chữ cái đầu của họ để phân biệt.', v_name;
  end;

  insert into public.player_secrets (player_id) values (v_player) returning token into v_token;

  return jsonb_build_object('player_id', v_player, 'token', v_token, 'room_id', v_room.id);
end;
$$;

-- Sinh viên ký hợp đồng (chỉ khi phòng còn ở phòng chờ)
create or replace function public.sign_contract(p_player_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform public._assert_player(p_player_id, p_token);

  select r.status into v_status
  from public.players p join public.rooms r on r.id = p.room_id
  where p.id = p_player_id;

  if v_status <> 'lobby' then
    raise exception 'Ca làm đã bắt đầu, không ký hợp đồng được nữa.';
  end if;

  update public.players set signed = true where id = p_player_id;
end;
$$;

-- Ghi nhận 1 chiếc áo. Trả về số áo hiện tại của người chơi.
-- Không báo lỗi khi không ghi nhận (hết giờ, chưa ký, bấm quá nhanh): chỉ trả số áo cũ.
create or replace function public.make_shirt(p_player_id uuid, p_token uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players%rowtype;
  v_room   public.rooms%rowtype;
  v_last   timestamptz;
  v_now    timestamptz;
begin
  perform public._assert_player(p_player_id, p_token);

  -- Khóa dòng người chơi: các lần bấm dồn dập của cùng một người được xử lý lần lượt
  select * into v_player from public.players where id = p_player_id for update;
  select * into v_room from public.rooms where id = v_player.room_id;

  -- Lấy giờ SAU khi khóa để so sánh chính xác (now() là giờ bắt đầu giao dịch)
  v_now := clock_timestamp();

  if v_room.status <> 'playing'
     or not v_player.signed
     or v_room.started_at is null
     or v_room.ends_at is null
     or v_now < v_room.started_at
     or v_now >= v_room.ends_at then
    return v_player.shirts;
  end if;

  -- Chống spam: áo trước của người này phải cách ít nhất 0,8 giây
  select max(made_at) into v_last from public.shirts where player_id = p_player_id;
  if v_last is not null and v_now - v_last < interval '800 milliseconds' then
    return v_player.shirts;
  end if;

  insert into public.shirts (player_id, room_id, made_at) values (p_player_id, v_room.id, v_now);
  update public.players set shirts = shirts + 1 where id = p_player_id returning shirts into v_player.shirts;

  return v_player.shirts;
end;
$$;

revoke execute on function public.server_now() from public;
revoke execute on function public.join_room(text, text) from public;
revoke execute on function public.sign_contract(uuid, uuid) from public;
revoke execute on function public.make_shirt(uuid, uuid) from public;
grant execute on function public.server_now() to anon, authenticated;
grant execute on function public.join_room(text, text) to anon, authenticated;
grant execute on function public.sign_contract(uuid, uuid) to anon, authenticated;
grant execute on function public.make_shirt(uuid, uuid) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 6. RPC CHỈ DÀNH CHO CHỦ XƯỞNG (đã đăng nhập)
-- ---------------------------------------------------------------------

-- Tạo phòng mới với mã 4 số ngẫu nhiên không trùng
create or replace function public.create_room()
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_try  int := 0;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập chủ xưởng.';
  end if;

  loop
    v_try := v_try + 1;
    begin
      insert into public.rooms (code, owner_id)
      values (lpad(floor(random() * 10000)::int::text, 4, '0'), auth.uid())
      returning * into v_room;
      return v_room;
    exception when unique_violation then
      if v_try >= 50 then
        raise exception 'Không tạo được mã phòng mới. Hãy xóa bớt phòng cũ rồi thử lại.';
      end if;
    end;
  end loop;
end;
$$;

-- Đổi cài đặt ca (chỉ khi đang ở phòng chờ)
create or replace function public.update_settings(
  p_room_id uuid,
  p_duration_sec int,
  p_wage int,
  p_price int,
  p_material int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);

  if (select status from public.rooms where id = p_room_id) <> 'lobby' then
    raise exception 'Chỉ đổi cài đặt được khi đang ở phòng chờ.';
  end if;
  if p_duration_sec is null or p_duration_sec < 10 or p_duration_sec > 3600 then
    raise exception 'Thời gian ca phải từ 10 đến 3600 giây.';
  end if;
  if p_wage is null or p_price is null or p_material is null
     or p_wage <= 0 or p_price <= 0 or p_material <= 0 then
    raise exception 'Mỗi ô cần một số lớn hơn 0.';
  end if;
  if p_price <= p_material then
    raise exception 'Giá bán phải lớn hơn nguyên liệu, nếu không áo không tạo ra giá trị mới.';
  end if;

  update public.rooms
  set duration_sec = p_duration_sec, wage = p_wage, price = p_price, material = p_material
  where id = p_room_id;
end;
$$;

-- Bắt đầu ca: đồng hồ tính theo giờ server
create or replace function public.start_shift(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);

  if (select status from public.rooms where id = p_room_id) <> 'lobby' then
    raise exception 'Chỉ bắt đầu ca được từ phòng chờ.';
  end if;

  update public.rooms
  set status = 'playing',
      started_at = now(),
      ends_at = now() + make_interval(secs => duration_sec)
  where id = p_room_id;
end;
$$;

-- Kết thúc ca (sớm hoặc khi hết giờ)
create or replace function public.end_shift(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);

  update public.rooms
  set status = 'ended',
      ends_at = least(ends_at, now())
  where id = p_room_id and status = 'playing';
end;
$$;

-- Đổi trạng thái: chỉ 'ended' hoặc 'reveal'.
-- ('playing' phải qua start_shift để đặt giờ; 'lobby' phải qua reset_room để xóa dữ liệu cũ.)
create or replace function public.set_status(p_room_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);

  if p_status not in ('ended', 'reveal') then
    raise exception 'Trạng thái không hợp lệ. Dùng start_shift để bắt đầu, reset_room để chơi lại.';
  end if;

  update public.rooms
  set status = p_status,
      ends_at = case when status = 'playing' then least(ends_at, now()) else ends_at end
  where id = p_room_id;
end;
$$;

-- Bật/tắt "Hiện tên gọi theo Mác" (điện thoại sinh viên đổi nhãn theo)
create or replace function public.set_show_terms(p_room_id uuid, p_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);
  update public.rooms set show_terms = coalesce(p_show, false) where id = p_room_id;
end;
$$;

-- Chơi lại: xóa công nhân và áo, đưa phòng về phòng chờ (giữ mã phòng và cài đặt)
create or replace function public.reset_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_owner(p_room_id);

  delete from public.shirts where room_id = p_room_id;
  delete from public.players where room_id = p_room_id;  -- player_secrets xóa theo (cascade)

  update public.rooms
  set status = 'lobby', started_at = null, ends_at = null, show_terms = false
  where id = p_room_id;
end;
$$;

revoke execute on function public.create_room() from public, anon;
revoke execute on function public.update_settings(uuid, int, int, int, int) from public, anon;
revoke execute on function public.start_shift(uuid) from public, anon;
revoke execute on function public.end_shift(uuid) from public, anon;
revoke execute on function public.set_status(uuid, text) from public, anon;
revoke execute on function public.set_show_terms(uuid, boolean) from public, anon;
revoke execute on function public.reset_room(uuid) from public, anon;
grant execute on function public.create_room() to authenticated;
grant execute on function public.update_settings(uuid, int, int, int, int) to authenticated;
grant execute on function public.start_shift(uuid) to authenticated;
grant execute on function public.end_shift(uuid) to authenticated;
grant execute on function public.set_status(uuid, text) to authenticated;
grant execute on function public.set_show_terms(uuid, boolean) to authenticated;
grant execute on function public.reset_room(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 7. REALTIME
-- ---------------------------------------------------------------------

-- 7a. Thay đổi trên bảng (chủ xưởng nghe rooms; mọi người nghe players)
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players') then
    alter publication supabase_realtime add table public.players;
  end if;
end;
$$;

-- 7b. Sinh viên không có quyền đọc bảng rooms nên không nhận được thay đổi của bảng đó.
-- Thay vào đó, mỗi lần phòng thay đổi, server phát một tin "room_changed" lên kênh công khai
-- "room:<mã phòng>", chỉ chứa các cột an toàn (giống view public_rooms).
create or replace function public._broadcast_room_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object(
        'id', new.id,
        'code', new.code,
        'status', new.status,
        'duration_sec', new.duration_sec,
        'wage', new.wage,
        'started_at', new.started_at,
        'ends_at', new.ends_at,
        'show_terms', new.show_terms,
        'price', case when new.status = 'reveal' then new.price end,
        'material', case when new.status = 'reveal' then new.material end
      ),
      'room_changed',
      'room:' || new.code,
      false  -- kênh công khai, sinh viên không cần đăng nhập
    );
  exception when others then
    -- Không để lỗi realtime chặn việc cập nhật phòng; client vẫn có cơ chế hỏi lại định kỳ
    raise warning 'Không phát được tin realtime: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke execute on function public._broadcast_room_change() from public, anon, authenticated;

drop trigger if exists rooms_broadcast_change on public.rooms;
create trigger rooms_broadcast_change
  after insert or update on public.rooms
  for each row execute function public._broadcast_room_change();


-- ---------------------------------------------------------------------
-- 8. NGƯỜI CHƠI ẢO (trang /admin/thu-tai, để nhóm tập dượt khi không đủ người)
-- ---------------------------------------------------------------------

alter table public.players add column if not exists is_bot boolean not null default false;

-- Thêm người chơi ảo vào phòng (chỉ chủ phòng, chỉ khi ở phòng chờ).
-- Tôn trọng giới hạn 40 người; tên trùng thì bỏ qua.
-- Trả về mảng { player_id, token, name } để trình duyệt của chủ xưởng điều khiển các bot.
create or replace function public.add_bots(p_room_id uuid, p_names text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_free   int;
  v_name   text;
  v_player uuid;
  v_token  uuid;
  v_out    jsonb := '[]'::jsonb;
begin
  perform public._assert_owner(p_room_id);

  select status into v_status from public.rooms where id = p_room_id for update;
  if v_status <> 'lobby' then
    raise exception 'Chỉ thêm người ảo được khi đang ở phòng chờ.';
  end if;

  select 40 - count(*) into v_free from public.players where room_id = p_room_id;

  foreach v_name in array coalesce(p_names, '{}') loop
    exit when v_free <= 0;
    v_name := btrim(v_name);
    continue when char_length(v_name) < 1 or char_length(v_name) > 30;

    v_player := null;
    insert into public.players (room_id, name, is_bot)
    values (p_room_id, v_name, true)
    on conflict do nothing
    returning id into v_player;
    continue when v_player is null;

    insert into public.player_secrets (player_id) values (v_player) returning token into v_token;
    v_out := v_out || jsonb_build_object('player_id', v_player, 'token', v_token, 'name', v_name);
    v_free := v_free - 1;
  end loop;

  return v_out;
end;
$$;

-- Xóa toàn bộ người chơi ảo của phòng (áo của họ xóa theo). Trả về số người đã xóa.
create or replace function public.remove_bots(p_room_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform public._assert_owner(p_room_id);
  delete from public.players where room_id = p_room_id and is_bot;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.add_bots(uuid, text[]) from public, anon;
revoke execute on function public.remove_bots(uuid) from public, anon;
grant execute on function public.add_bots(uuid, text[]) to authenticated;
grant execute on function public.remove_bots(uuid) to authenticated;
