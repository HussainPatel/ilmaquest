-- Seed content for local development/demoing the gameplay loop.
--
-- IMPORTANT: this deliberately bypasses the human review pipeline described in
-- docs/CONTENT_PROCESS.md (DRAFT -> PENDING_REVIEW -> APPROVED -> PUBLISHED,
-- two-person rule, etc.) by inserting directly as state='published'. That
-- pipeline is enforced by RLS, which this migration runs above (as the
-- Postgres superuser), not by the schema itself — so this is fine for seed
-- data, but real content added later MUST go through the actual reviewer UI
-- once it exists, not through a migration like this one. Every question below
-- still carries a real, checkable source citation, matching the sourcing
-- rules in CONTENT_PROCESS.md §1.

-- A fixed "system" user to own this seed content. Inserted directly into
-- auth.users (a standard Supabase seeding pattern) — this account can't
-- actually log in (no real password), it only exists to satisfy the
-- created_by foreign keys below. The handle_new_user() trigger fires
-- automatically and creates the matching public.users row.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'seed-system@ilmaquest.internal',
  '', now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"IlmaQuest Seed System"}'
);

update public.users set role = 'admin'
  where id = '00000000-0000-0000-0000-000000000001';

insert into public.categories (id, name, audience_level, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'Quran', 'general', true),
  ('10000000-0000-0000-0000-000000000002', 'Seerah', 'general', true);

insert into public.sources (
  id, type, external_ref, text_translation, translator, citation_text, created_by
) values
  ('20000000-0000-0000-0000-000000000001', 'quran', '1:1-7', null, 'Saheeh International',
    null, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'quran', '112:1-4', null, 'Saheeh International',
    null, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'quran', '2:255', null, 'Saheeh International',
    null, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'seerah', 'birth-of-the-prophet', null, null,
    'Ar-Raheeq Al-Makhtum, ch. 1', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'seerah', 'the-hijrah', null, null,
    'Ar-Raheeq Al-Makhtum, ch. 8', '00000000-0000-0000-0000-000000000001');

insert into public.questions (
  id, source_id, category_id, question_text, choices, correct_choice_id,
  explanation_text, difficulty, state, created_by
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Which surah is known as "The Opening" and is recited in every unit of prayer?',
    '[{"id":"a","text":"Al-Fatiha"},{"id":"b","text":"Al-Baqarah"},{"id":"c","text":"Al-Ikhlas"},{"id":"d","text":"An-Nas"}]',
    'a',
    'Surah Al-Fatiha (1:1-7) is called "The Opening" and is recited in every unit (rak''ah) of the five daily prayers.',
    1, 'published', '00000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Surah Al-Ikhlas (112) declares the oneness of Allah. What does "Al-Ikhlas" mean?',
    '[{"id":"a","text":"The Cave"},{"id":"b","text":"Sincerity"},{"id":"c","text":"The Star"},{"id":"d","text":"The Table"}]',
    'b',
    '"Al-Ikhlas" means sincerity/purity of faith — the surah affirms Allah''s absolute oneness (112:1-4).',
    2, 'published', '00000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Ayat al-Kursi, one of the most well-known verses in the Quran, is found in which surah?',
    '[{"id":"a","text":"Aal-Imran"},{"id":"b","text":"An-Nisa"},{"id":"c","text":"Al-Baqarah"},{"id":"d","text":"Al-Ma''idah"}]',
    'c',
    'Ayat al-Kursi is verse 255 of Surah Al-Baqarah (2:255), describing Allah''s knowledge and sovereignty.',
    2, 'published', '00000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'In which city was Prophet Muhammad ﷺ born?',
    '[{"id":"a","text":"Madinah"},{"id":"b","text":"Makkah"},{"id":"c","text":"Ta''if"},{"id":"d","text":"Jerusalem"}]',
    'b',
    'The Prophet ﷺ was born in Makkah, in the Year of the Elephant.',
    1, 'published', '00000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'What is the name of the migration of the Prophet ﷺ and his companions from Makkah to Madinah?',
    '[{"id":"a","text":"Isra"},{"id":"b","text":"Mi''raj"},{"id":"c","text":"Hijrah"},{"id":"d","text":"Badr"}]',
    'c',
    'The Hijrah (migration) to Madinah in 622 CE marks the start of the Islamic calendar.',
    1, 'published', '00000000-0000-0000-0000-000000000001'
  );

-- One ready-to-host demo quiz bundling all 5 seeded questions.
insert into public.quizzes (id, title, category_id, question_ids, created_by) values (
  '40000000-0000-0000-0000-000000000001',
  'IlmaQuest Demo Quiz — Quran & Seerah Basics',
  '10000000-0000-0000-0000-000000000001',
  array[
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005'
  ]::uuid[],
  '00000000-0000-0000-0000-000000000001'
);
