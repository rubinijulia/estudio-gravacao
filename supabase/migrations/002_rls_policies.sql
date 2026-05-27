-- ============================================================================
-- ROW LEVEL SECURITY SETUP
-- ============================================================================

-- Enable RLS on all tables
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

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role() RETURNS user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM users_profile WHERE id = auth.uid()),
    'operacional'::user_role
  )
$$ LANGUAGE sql STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() = 'admin'::user_role
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- users_profile POLICIES
-- ============================================================================

CREATE POLICY "users_profile_select_self" ON users_profile
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_profile_select_admin" ON users_profile
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "users_profile_insert_admin" ON users_profile
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "users_profile_update_admin" ON users_profile
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "users_profile_delete_admin" ON users_profile
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- clientes POLICIES
-- ============================================================================

CREATE POLICY "clientes_select" ON clientes
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('admin', 'editor') OR
    get_current_user_role() = 'operacional'
  );

CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('admin', 'editor')
  );

CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin', 'editor'));

CREATE POLICY "clientes_delete" ON clientes
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'admin');

-- ============================================================================
-- servicos POLICIES
-- ============================================================================

CREATE POLICY "servicos_select" ON servicos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "servicos_insert" ON servicos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "servicos_update" ON servicos
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "servicos_delete" ON servicos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- vendas POLICIES
-- ============================================================================

CREATE POLICY "vendas_select_admin" ON vendas
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "vendas_select_editor" ON vendas
  FOR SELECT TO authenticated
  USING (get_current_user_role() = 'editor');

CREATE POLICY "vendas_insert" ON vendas
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() AND
    created_by = auth.uid()
  );

CREATE POLICY "vendas_update_admin" ON vendas
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "vendas_delete_admin" ON vendas
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- vendas_itens POLICIES
-- ============================================================================

CREATE POLICY "vendas_itens_select_admin" ON vendas_itens
  FOR SELECT TO authenticated
  USING (
    is_admin() OR
    (
      get_current_user_role() = 'editor' AND
      venda_id IN (SELECT id FROM vendas)
    )
  );

CREATE POLICY "vendas_itens_insert" ON vendas_itens
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "vendas_itens_update" ON vendas_itens
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "vendas_itens_delete" ON vendas_itens
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- agendamentos POLICIES
-- ============================================================================

CREATE POLICY "agendamentos_select_all" ON agendamentos
  FOR SELECT TO authenticated
  USING (
    is_admin() OR
    get_current_user_role() = 'editor' OR
    (
      get_current_user_role() = 'operacional' AND
      data = CURRENT_DATE
    )
  );

CREATE POLICY "agendamentos_insert" ON agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR get_current_user_role() = 'editor'
  );

CREATE POLICY "agendamentos_update" ON agendamentos
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR get_current_user_role() = 'editor'
  );

CREATE POLICY "agendamentos_delete" ON agendamentos
  FOR DELETE TO authenticated
  USING (
    is_admin() OR get_current_user_role() = 'editor'
  );

-- ============================================================================
-- projetos POLICIES
-- ============================================================================

CREATE POLICY "projetos_select" ON projetos
  FOR SELECT TO authenticated
  USING (
    is_admin() OR get_current_user_role() = 'editor'
  );

CREATE POLICY "projetos_insert" ON projetos
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR get_current_user_role() = 'editor'
  );

CREATE POLICY "projetos_update" ON projetos
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    (get_current_user_role() = 'editor' AND (responsavel_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "projetos_delete" ON projetos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- projetos_historico POLICIES
-- ============================================================================

CREATE POLICY "projetos_historico_select" ON projetos_historico
  FOR SELECT TO authenticated
  USING (
    is_admin() OR get_current_user_role() = 'editor'
  );

CREATE POLICY "projetos_historico_insert" ON projetos_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR get_current_user_role() = 'editor'
  );

-- ============================================================================
-- custos_fixos POLICIES (ADMIN ONLY)
-- ============================================================================

CREATE POLICY "custos_fixos_select" ON custos_fixos
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "custos_fixos_insert" ON custos_fixos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "custos_fixos_update" ON custos_fixos
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "custos_fixos_delete" ON custos_fixos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- custos_variaveis POLICIES (ADMIN ONLY)
-- ============================================================================

CREATE POLICY "custos_variaveis_select" ON custos_variaveis
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "custos_variaveis_insert" ON custos_variaveis
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "custos_variaveis_update" ON custos_variaveis
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "custos_variaveis_delete" ON custos_variaveis
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- metas POLICIES (ADMIN ONLY)
-- ============================================================================

CREATE POLICY "metas_select" ON metas
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "metas_insert" ON metas
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "metas_update" ON metas
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "metas_delete" ON metas
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- recebimentos POLICIES (ADMIN ONLY)
-- ============================================================================

CREATE POLICY "recebimentos_select" ON recebimentos
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "recebimentos_insert" ON recebimentos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "recebimentos_update" ON recebimentos
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "recebimentos_delete" ON recebimentos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- configuracoes POLICIES (ADMIN ONLY)
-- ============================================================================

CREATE POLICY "configuracoes_select" ON configuracoes
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "configuracoes_update" ON configuracoes
  FOR UPDATE TO authenticated
  USING (is_admin());
