-- Ask AI usage controls and audit metadata.
alter table questions add column if not exists model text;
alter table questions add column if not exists input_tokens integer;
alter table questions add column if not exists output_tokens integer;
alter table questions add column if not exists response_id text;

create index if not exists questions_author_created_at_idx
  on questions(author_id, created_at desc);

