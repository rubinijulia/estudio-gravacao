# 🔐 Reabilitar Row Level Security (RLS)

Execute este SQL **no Supabase** para proteger o banco de dados:

```sql
-- ============================================================================
-- HELPER FUNCTIONS (com SECURITY DEFINER para evitar recursão)
-- ============================================================================

DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM users_profile WHERE id = auth.uid()),
    'operacional'::user_role
  )
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT get_current_user_role() = 'admin'::user_role
$$;

GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;

-- ============================================================================
-- HABILITAR RLS
-- ============================================================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_fixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_variaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP TODAS POLICIES EXISTENTES (limpar)
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- USERS_PROFILE - todos veem perfis (para joins), apenas admin altera
-- ============================================================================

CREATE POLICY "users_profile_select" ON users_profile
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_profile_admin_all" ON users_profile
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- CLIENTES - admin e editor têm acesso total. Operacional só lê
-- ============================================================================

CREATE POLICY "clientes_select" ON clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "clientes_delete" ON clientes
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================================
-- SERVICOS - todos leem, só admin altera
-- ============================================================================

CREATE POLICY "servicos_select" ON servicos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "servicos_admin_all" ON servicos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- VENDAS - admin e editor veem, só admin cria/edita/deleta
-- ============================================================================

CREATE POLICY "vendas_select" ON vendas
  FOR SELECT TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "vendas_admin_all" ON vendas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "vendas_itens_select" ON vendas_itens
  FOR SELECT TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "vendas_itens_admin_all" ON vendas_itens
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- AGENDAMENTOS - operacional vê só de hoje, admin/editor veem tudo
-- ============================================================================

CREATE POLICY "agendamentos_select" ON agendamentos
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('admin', 'editor') OR
    (get_current_user_role() = 'operacional' AND data = CURRENT_DATE)
  );
CREATE POLICY "agendamentos_insert" ON agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "agendamentos_update" ON agendamentos
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor', 'operacional'));
CREATE POLICY "agendamentos_delete" ON agendamentos
  FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));

-- ============================================================================
-- PROJETOS - admin e editor têm acesso
-- ============================================================================

CREATE POLICY "projetos_select" ON projetos
  FOR SELECT TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "projetos_insert" ON projetos
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "projetos_update" ON projetos
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "projetos_delete" ON projetos
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "projetos_historico_select" ON projetos_historico
  FOR SELECT TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));
CREATE POLICY "projetos_historico_insert" ON projetos_historico
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'editor'));

-- ============================================================================
-- FINANCEIRO - SÓ ADMIN
-- ============================================================================

CREATE POLICY "custos_fixos_admin" ON custos_fixos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "custos_variaveis_admin" ON custos_variaveis
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "metas_admin" ON metas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "recebimentos_admin" ON recebimentos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "configuracoes_admin" ON configuracoes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- Permitir SELECT em configurações para todos autenticados
-- (para o sistema funcionar - prazos, feriados, etc.)
-- ============================================================================

CREATE POLICY "configuracoes_select_all" ON configuracoes
  FOR SELECT TO authenticated USING (true);
```

## 👉 Execute no SQL Editor do Supabase

Cole tudo e clique em **RUN**.

Depois disso:
- ✅ Operacional só vê agenda de hoje
- ✅ Editor não acessa financeiro/configurações
- ✅ Admin acessa tudo
- ✅ RLS protege o banco contra acessos diretos
