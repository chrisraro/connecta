-- Onboarding. Ports convex/users.ts updateOnboarding.
--
-- Two jobs in one transaction: store the wizard snapshot on the users row,
-- and -- on completion -- create or update the profile it describes. They
-- belong together: a snapshot saved without its profile leaves somebody who
-- finished onboarding with nothing to show for it.
--
-- Three behaviours here are fixes the Convex version earned the hard way, and
-- each is preserved deliberately.

create function public.save_onboarding(
  profile_category text,
  contact_email    text,
  full_name        text,
  job_title        text,
  company_name     text default null,
  phone            text default null,
  website          text default null,
  about            text default null,
  avatar_url       text default null,
  services         text[] default '{}',
  social_links     jsonb default '[]'::jsonb,
  mark_completed   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller      uuid := auth.uid();
  ptype       public.profile_type;
  wizard      jsonb;
  snapshot    jsonb;
  existing    public.profiles;
  new_profile public.profiles;
  palette     jsonb;
  theme_id    text;
  order_arr   jsonb;
  result_id   uuid;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  ptype := coalesce(nullif(profile_category, '')::public.profile_type, 'individual');

  -- Only the fields the WIZARD owns. Kept separate from the profile write
  -- below because the merge semantics differ between create and edit.
  wizard := jsonb_strip_nulls(jsonb_build_object(
    'fullName',  full_name,
    'title',     coalesce(nullif(job_title, ''), 'Professional'),
    'company',   nullif(company_name, ''),
    'phone',     coalesce(phone, ''),
    'email',     coalesce(contact_email, ''),
    'website',   nullif(website, ''),
    'about',     nullif(about, ''),
    'avatarUrl', nullif(avatar_url, ''),
    'services',  to_jsonb(services)
  ));

  snapshot := wizard || jsonb_build_object('profileCategory', ptype::text);

  update public.users
     set onboarding_data      = snapshot,
         onboarding_completed = case when mark_completed then true else onboarding_completed end
   where id = caller;

  if not mark_completed then
    return jsonb_build_object('success', true, 'profileId', null);
  end if;

  select * into existing
    from public.profiles where owner_id = caller
   order by created_at asc limit 1;

  if existing.id is null then
    -- FIX 1 (Task 12): create through the same shape the builder produces.
    -- The old direct insert never assigned a slug and never seeded a card
    -- design, so an onboarding-created profile was structurally different
    -- from a builder-created one. The slug is now a trigger, and skin
    -- defaults at the column, so both paths converge by construction.
    theme_id := case ptype
                  when 'business' then 'architectural'
                  when 'company'  then 'kinetic'
                  else 'editorial'
                end;

    palette := case when ptype = 'company'
                 then '{"primary":"#ba9eff","background":"#0e0e0e","text":"#ffffff"}'::jsonb
                 else '{"primary":"#705838","background":"#fbf9f4","text":"#1b1c19"}'::jsonb
               end;

    -- FIX 2 (Task 13): "individual" is the only default layout without a
    -- Services block, but the wizard offers the service-tag step to EVERY
    -- profile type. Omitting it unconditionally meant an individual's freshly
    -- collected services vanished the instant onboarding finished --
    -- indistinguishable in the builder from a block they had chosen to hide.
    -- Included whenever there is real data.
    order_arr := case ptype
      when 'business' then
        '["Hero","About","Services","Products","Properties","Gallery","Contact"]'::jsonb
      when 'company' then
        '["Hero","About","Services","Projects","Products","Contact"]'::jsonb
      else
        case when coalesce(array_length(services, 1), 0) > 0
          then '["Hero","About","Services","Experience","Education","Projects","Contact"]'::jsonb
          else '["Hero","About","Experience","Education","Projects","Contact"]'::jsonb
        end
    end;

    insert into public.profiles (owner_id, name, profile_type, agent_info, layout_config)
    values (
      caller,
      full_name || '''s Profile',
      ptype,
      wizard || jsonb_build_object('socialLinks', coalesce(social_links, '[]'::jsonb)),
      jsonb_build_object(
        'themeId',        theme_id,
        'colorPalette',   palette,
        'componentOrder', order_arr,
        'heroStyle',      'default')
    )
    returning * into new_profile;

    result_id := new_profile.id;
  else
    -- FIX 3 (Task 17 / C3): "Edit Profile Setup" re-runs this with
    -- mark_completed against a profile that already exists. The old code read
    -- the id and returned it WITHOUT WRITING, so every field the user had just
    -- retyped was silently discarded behind a success toast.
    --
    -- The merge order matters: existing first, wizard second, so wizard fields
    -- win but everything the wizard never asks about survives -- socialLinks,
    -- additionalPhones, certification, education, techStack, experience,
    -- testimonials, gallery are all builder-only inputs. Replacing the object
    -- wholesale would trade this data-loss bug for a worse one.
    --
    -- layout_config and skin are deliberately NOT touched: they are the
    -- BUILDER's data, and re-deriving them here would wipe any theme or
    -- section-order work done after onboarding.
    update public.profiles
       set profile_type = ptype,
           agent_info   = coalesce(agent_info, '{}'::jsonb) || wizard
     where id = existing.id;

    result_id := existing.id;
  end if;

  return jsonb_build_object('success', true, 'profileId', result_id);
end;
$$;

revoke all on function public.save_onboarding(
  text, text, text, text, text, text, text, text, text, text[], jsonb, boolean
) from public, anon;
grant execute on function public.save_onboarding(
  text, text, text, text, text, text, text, text, text, text[], jsonb, boolean
) to authenticated;
