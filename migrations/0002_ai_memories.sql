create table if not exists ai_memories (
  id text primary key,
  user_id text not null,
  memory text not null,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists ai_memories_user_id_idx on ai_memories (user_id, updated_at desc);
