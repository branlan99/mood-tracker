-- App settings table for global configuration
create table if not exists public.app_settings (
    key text primary key,
    value text,
    updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

-- Allow anyone to read settings (needed for signup page pricing)
create policy "app_settings_read_all"
    on public.app_settings
    for select
    using (true);

-- Allow authenticated users to insert/update settings
create policy "app_settings_write_auth"
    on public.app_settings
    for insert
    with check (auth.role() = 'authenticated');

create policy "app_settings_update_auth"
    on public.app_settings
    for update
    using (auth.role() = 'authenticated');
