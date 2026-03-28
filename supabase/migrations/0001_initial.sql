-- Enable pgvector extension
create extension if not exists vector;

-- Collections
create table collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  cover_url   text,
  created_at  timestamptz default now()
);

-- Tags
create table tags (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Items
create table items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  description   text not null default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Full-text search on description (Portuguese)
create index items_description_fts
  on items using gin(to_tsvector('portuguese', description));

-- Item <-> Tag join
create table item_tags (
  item_id uuid references items(id) on delete cascade,
  tag_id  uuid references tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

-- Photos with CLIP embeddings
create table photos (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  storage_path text not null,
  url          text not null,
  embedding    vector(512),
  position     int default 0,
  created_at   timestamptz default now()
);

-- HNSW index for fast cosine similarity search
create index photos_embedding_hnsw
  on photos using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Auto-update updated_at on items
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Similarity search RPC
create or replace function search_similar_photos(
  query_embedding vector(512),
  match_count     int default 10,
  filter_collection_id uuid default null
)
returns table (
  item_id         uuid,
  photo_id        uuid,
  url             text,
  distance        float,
  description     text,
  collection_id   uuid,
  collection_name text
)
language sql stable
as $$
  select
    i.id            as item_id,
    p.id            as photo_id,
    p.url           as url,
    p.embedding <=> query_embedding as distance,
    i.description,
    i.collection_id,
    c.name          as collection_name
  from photos p
  join items i on i.id = p.item_id
  join collections c on c.id = i.collection_id
  where p.embedding is not null
    and (filter_collection_id is null or i.collection_id = filter_collection_id)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Text search RPC (Portuguese)
create or replace function search_items_text(
  query_text text,
  filter_collection_id uuid default null
)
returns table (
  id            uuid,
  collection_id uuid,
  description   text,
  created_at    timestamptz
)
language sql stable
as $$
  select id, collection_id, description, created_at
  from items
  where to_tsvector('portuguese', description) @@ plainto_tsquery('portuguese', query_text)
    and (filter_collection_id is null or collection_id = filter_collection_id)
  order by ts_rank(to_tsvector('portuguese', description), plainto_tsquery('portuguese', query_text)) desc;
$$;

-- Disable RLS (single user)
alter table collections disable row level security;
alter table items       disable row level security;
alter table tags        disable row level security;
alter table item_tags   disable row level security;
alter table photos      disable row level security;
