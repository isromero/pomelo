insert into public.prompt_concepts (concept_key, format, prompt_es, prompt_en, active)
values (
  'small_gesture_smile',
  'question',
  '¿Qué pequeño gesto de tu pareja te hizo sonreír esta semana?',
  'What small thing your partner did made you smile this week?',
  true
)
on conflict (concept_key) do update
set format = excluded.format,
    prompt_es = excluded.prompt_es,
    prompt_en = excluded.prompt_en,
    active = excluded.active,
    response_type = 'text',
    response_options = '[]'::jsonb;
