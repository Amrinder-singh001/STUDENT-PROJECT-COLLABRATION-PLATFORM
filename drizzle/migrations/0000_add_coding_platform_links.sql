alter table public.profiles
  add column if not exists leetcode_url text,
  add column if not exists hackerrank_url text,
  add column if not exists gfg_url text,
  add column if not exists codechef_url text;