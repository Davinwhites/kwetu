-- KwetuCV per-user documents, subscriptions, and payments
create table if not exists cv_documents (
  id text primary key,
  user_id text not null,
  name text not null default 'Untitled CV',
  payload text not null,
  updated_at bigint not null,
  created_at bigint not null
);
create index if not exists cv_documents_user_id_idx on cv_documents (user_id);

create table if not exists subscriptions (
  user_id text primary key,
  plan text not null default 'free',
  status text not null default 'active',
  period_end bigint,
  finish_credits integer not null default 0,
  channel text,
  updated_at bigint not null
);

create table if not exists payments (
  id text primary key,
  user_id text not null,
  plan text not null,
  amount_ugx integer not null,
  channel text not null,
  phone text,
  status text not null,
  created_at bigint not null
);
create index if not exists payments_user_id_idx on payments (user_id);

create table if not exists ai_usage (
  user_id text not null,
  period text not null,
  count integer not null default 0,
  primary key (user_id, period)
);
