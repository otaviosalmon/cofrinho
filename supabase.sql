create table if not exists public.gastos (
  sync_id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  descricao text not null,
  categoria text not null,
  valor numeric(10,2) not null check (valor > 0),
  data_gasto timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists idx_gastos_user_data
  on public.gastos (user_id, data_gasto desc);

alter table public.gastos enable row level security;

revoke all on table public.gastos from anon;
grant select, insert, update on table public.gastos to authenticated;

drop policy if exists "read own gastos" on public.gastos;
create policy "read own gastos"
on public.gastos for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "insert own gastos" on public.gastos;
create policy "insert own gastos"
on public.gastos for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "update own gastos" on public.gastos;
create policy "update own gastos"
on public.gastos for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);
