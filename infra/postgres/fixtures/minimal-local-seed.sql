-- ============================================================
-- Aidraft — Fixtures mínimos para validación local
-- ============================================================
-- Solo para PostgreSQL local (docker-compose.postgres-local.yml).
-- No usar en producción. No contiene datos reales.
-- Emails: *.example.test (dominio reservado, nunca real).
-- ============================================================

-- Usuario de prueba
INSERT INTO public.users (id, email, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@example.test',
  'Demo User',
  'user'
) ON CONFLICT (id) DO NOTHING;

-- Perfil asociado
INSERT INTO public.profiles (user_id, full_name, target_role, skills)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo User',
  'Frontend Developer',
  ARRAY['TypeScript', 'React', 'Next.js']
) ON CONFLICT (user_id) DO NOTHING;

-- Oportunidad de prueba
INSERT INTO public.opportunities (user_id, source, title, company, url, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'manual',
  'Frontend Developer — Demo Company',
  'Demo Company',
  'https://example.test/job/demo',
  'guardada'
) ON CONFLICT DO NOTHING;

-- Tarea de prueba
INSERT INTO public.tasks (user_id, title, status, priority)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Revisar oportunidades de prueba',
  'pendiente',
  'media'
) ON CONFLICT DO NOTHING;

-- Fuente de prueba
INSERT INTO public.sources (user_id, name, slug, source_type, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Source',
  'demo-source',
  'manual',
  'active'
) ON CONFLICT DO NOTHING;
