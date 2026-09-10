-- Vanity slugs, assigned by the database.
--
-- convex/profiles.ts generated these in application code. Moving it into the
-- database is not tidiness -- it is the only way to make the two rules that
-- matter actually hold:
--
--   1. A slug is assigned ONCE and never changes. The slug is printed on a
--      physical card and shared as an identity; changing it breaks every card
--      already in someone's wallet. In JS this was a convention ("assigned
--      once and never touched again") that any future writer could break by
--      passing a new value. As a trigger it is enforced.
--
--   2. Uniqueness is decided at write time. The JS version SELECTed for a
--      collision and then INSERTed, which is a race: two profiles created in
--      the same moment can both find the slug free. The unique index is the
--      real arbiter, so this loops against it rather than trusting a prior
--      read.
--
-- The slug source is deliberately the PERSON'S NAME from agent_info, not
-- profiles.name -- the builder sets name to "<fullName>'s Profile", which
-- would yield /christian-raros-profile instead of /christian-raro.

-- The unaccent extension is not enabled on this project, and enabling it just
-- to fold accents is a heavier dependency than the job needs. This covers the
-- Latin-1 range the product actually sees (Filipino and Spanish names), which
-- is what NFD-normalise-then-strip-combining-marks achieves in JS.
create function public.unaccent_fallback(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    input,
    'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçÁÀÂÄÃÅĀÉÈÊËĒÍÌÎÏĪÓÒÔÖÕØŌÚÙÛÜŪÑÇ',
    'aaaaaaaeeeeeiiiiiooooooouuuuuncAAAAAAAEEEEEIIIIIOOOOOOOUUUUUNC'
  )
$$;

-- Route segments a slug may never occupy, mirroring lib/slug.ts RESERVED.
-- Duplicated rather than shared because the check has to run where the write
-- happens; lib/slug.ts stays the client-side copy for optimistic display.
create function public.is_reserved_slug(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'p','t','api','auth','sign-in','sign-up','dashboard','admin','shop',
    'privacy','terms','pricing','about','contact','support','blog','docs',
    '_next','favicon.ico','opengraph-image','robots.txt','sitemap.xml'
  ])
$$;

-- Mirrors lib/slug.ts slugify: strip diacritics, drop apostrophes entirely so
-- O'Brien becomes obrien rather than o-brien, collapse everything else to
-- single hyphens, trim, cap at 48 chars.
create function public.slugify(input text, suffix text default null)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  base text;
  core text;
  out_text text;
begin
  base := lower(public.unaccent_fallback(coalesce(input, '')));
  base := regexp_replace(base, '[''‘’]', '', 'g');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');

  core := coalesce(nullif(base, ''), 'profile');

  out_text := case when suffix is null then core else core || '-' || suffix end;
  out_text := left(out_text, 48);
  out_text := regexp_replace(out_text, '-+$', '', 'g');
  return out_text;
end;
$$;

-- Shared assignment logic, taking and returning the row so both the insert and
-- the legacy-backfill update path can use it without duplicating the loop.
create function public.assign_profile_slug_for(row_in public.profiles)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  source    text;
  candidate text;
  attempt   int := 0;
begin
  source := nullif(btrim(coalesce(row_in.agent_info ->> 'fullName', '')), '');
  source := coalesce(source, row_in.name);

  loop
    if attempt = 0 then
      candidate := public.slugify(source);
    else
      -- Suffix drawn from random bytes rather than a counter, so two
      -- concurrent inserts of the same name diverge instead of both trying
      -- "-2" next and colliding again.
      candidate := public.slugify(
        source,
        substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 3) || attempt::text);
    end if;

    if not public.is_reserved_slug(candidate)
       and not exists (select 1 from public.profiles p
                        where lower(p.slug) = lower(candidate) and p.id <> row_in.id)
    then
      row_in.slug := candidate;
      return row_in;
    end if;

    attempt := attempt + 1;
    exit when attempt > 12;
  end loop;

  -- Guaranteed-unique fallback. Ugly on purpose: it should be visible that
  -- something unusual happened, rather than silently failing the save of a
  -- profile somebody has just spent time filling in.
  row_in.slug := public.slugify(source, replace(gen_random_uuid()::text, '-', ''));
  return row_in;
end;
$$;

create function public.assign_profile_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;
  new := public.assign_profile_slug_for(new);
  return new;
end;
$$;

create trigger profiles_assign_slug
  before insert on public.profiles
  for each row execute function public.assign_profile_slug();

-- Rule 1, enforced. A published /<slug> must never move under a printed card.
-- A legacy row with no slug may still GAIN one; an existing slug is frozen.
create function public.freeze_profile_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.slug is not null and new.slug is distinct from old.slug then
    raise exception using errcode = 'P0001',
      message = 'A profile URL cannot be changed once it has been published.',
      detail  = 'SLUG_IMMUTABLE';
  end if;

  if new.slug is null and old.slug is null then
    new := public.assign_profile_slug_for(new);
  end if;

  return new;
end;
$$;

create trigger profiles_freeze_slug
  before update on public.profiles
  for each row execute function public.freeze_profile_slug();

revoke all on function public.assign_profile_slug()   from public, anon, authenticated;
revoke all on function public.freeze_profile_slug()   from public, anon, authenticated;
revoke all on function public.assign_profile_slug_for(public.profiles)
  from public, anon, authenticated;
revoke all on function public.slugify(text, text)     from public, anon;
revoke all on function public.is_reserved_slug(text)  from public, anon;
revoke all on function public.unaccent_fallback(text) from public, anon;
