# ⚡ Setup Supabase - Execute Agora Mesmo

Siga estes passos para criar todas as tabelas:

## 1️⃣ Acesse o Supabase

1. Abra: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu esquerdo)
4. Clique em **New Query**

## 2️⃣ Execute o Script de Schema

Copie tudo abaixo e cole no SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TYPES & ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'operacional');
CREATE TYPE venda_status_pagamento AS ENUM ('a_receber', 'sinal_pago', 'totalmente_recebido', 'cancelado');
CREATE TYPE venda_status_servico AS ENUM ('em_curso', 'realizada', 'cancelada');
CREATE TYPE forma_pagamento AS ENUM ('pix', 'debito', 'credito', 'transferencia', 'dinheiro');
CREATE TYPE servico_categoria AS ENUM ('podcast', 'hora_avulsa', 'plano_mensal', 'diaria', 'pos_producao', 'identidade', 'curso', 'merch', 'outros');
CREATE TYPE agendamento_tipo AS ENUM ('gravacao', 'reuniao', 'outro');
CREATE TYPE projeto_status AS ENUM ('gravado', 'editando', 'cortes', 'enviado', 'em_ajuste', 'finalizado');
CREATE TYPE projeto_formato AS ENUM ('podcast', 'live', 'video_curso', 'video_institucional', 'outro');
CREATE TYPE custo_categoria AS ENUM ('aluguel', 'pro_labore', 'software', 'marketing', 'contabilidade', 'outros');
CREATE TYPE recebimento_tipo AS ENUM ('sinal', 'quitacao', 'parcela', 'avulso');

-- TABLES
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role user_role NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  valor_hora NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  documento TEXT,
  instagram TEXT,
  observacoes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  categoria servico_categoria NOT NULL,
  valor_padrao NUMERIC NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC NOT NULL,
  desconto NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento forma_pagamento,
  parcelas INTEGER NOT NULL DEFAULT 1,
  taxa_cartao NUMERIC NOT NULL DEFAULT 0,
  status_pagamento venda_status_pagamento NOT NULL DEFAULT 'a_receber',
  status_servico venda_status_servico NOT NULL DEFAULT 'em_curso',
  valor_sinal NUMERIC,
  data_sinal DATE,
  data_quitacao DATE,
  observacoes TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS vendas_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  estudio TEXT,
  tipo agendamento_tipo NOT NULL DEFAULT 'gravacao',
  gravacao_realizada BOOLEAN NOT NULL DEFAULT FALSE,
  data_check TIMESTAMP WITH TIME ZONE,
  checked_by UUID REFERENCES users_profile(id),
  observacoes TEXT,
  google_event_id TEXT,
  google_calendar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID NOT NULL UNIQUE REFERENCES agendamentos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  formato projeto_formato NOT NULL,
  tem_edicao BOOLEAN NOT NULL DEFAULT FALSE,
  tem_cortes BOOLEAN NOT NULL DEFAULT FALSE,
  quantidade_cortes INTEGER NOT NULL DEFAULT 0,
  tem_identidade_visual BOOLEAN NOT NULL DEFAULT FALSE,
  tem_legendas BOOLEAN NOT NULL DEFAULT FALSE,
  data_gravacao DATE NOT NULL,
  data_entrega_prevista DATE NOT NULL,
  data_entrega_real DATE,
  prazo_personalizado BOOLEAN NOT NULL DEFAULT FALSE,
  status projeto_status NOT NULL DEFAULT 'gravado',
  responsavel_id UUID REFERENCES users_profile(id),
  observacoes TEXT,
  arquivos_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS projetos_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  movido_por UUID NOT NULL REFERENCES users_profile(id),
  data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS custos_fixos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  categoria custo_categoria NOT NULL,
  valor NUMERIC NOT NULL,
  dia_vencimento INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS custos_variaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competencia DATE NOT NULL,
  descricao TEXT NOT NULL,
  colaborador_id UUID REFERENCES users_profile(id),
  horas_trabalhadas NUMERIC,
  valor_hora NUMERIC,
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS metas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competencia DATE NOT NULL UNIQUE,
  meta_vendas NUMERIC NOT NULL,
  meta_gravacoes INTEGER,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS recebimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_recebimento DATE NOT NULL,
  tipo recebimento_tipo NOT NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor JSONB,
  descricao TEXT
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_itens_updated_at BEFORE UPDATE ON vendas_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projetos_historico_updated_at BEFORE UPDATE ON projetos_historico
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custos_fixos_updated_at BEFORE UPDATE ON custos_fixos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custos_variaveis_updated_at BEFORE UPDATE ON custos_variaveis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recebimentos_updated_at BEFORE UPDATE ON recebimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('prazo_sem_edicao_dias_uteis', '3', 'Dias úteis padrão para entrega sem edição'),
  ('prazo_com_edicao_dias_uteis', '5', 'Dias úteis padrão para entrega com edição'),
  ('taxa_cartao_credito_percentual', '4.5', 'Taxa de cartão de crédito em %'),
  ('acrescimo_noturno_fds_percentual', '20', 'Acréscimo para gravações noturnas/FDS em %'),
  ('horario_inicio_noturno', '"20:00"', 'Horário de início considerado noturno'),
  ('feriados', '[]', 'Array de datas ISO de feriados')
ON CONFLICT (chave) DO NOTHING;
```

Clique em **RUN** para executar.

## 3️⃣ Execute o Script de RLS Policies

1. Clique em **New Query** (para criar uma nova query)
2. Copie tudo do arquivo `supabase/migrations/002_rls_policies.sql`
3. Cole no editor
4. Clique em **RUN**

⚠️ Se aparecer aviso tipo "POLICY already exists", ignore - é normal.

## 4️⃣ Crie um Usuário de Teste

1. Ainda no SQL Editor, crie uma nova query
2. Cole isso:

```sql
-- Criar usuário de teste (substitua o email)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@estudio.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  now(),
  now()
) RETURNING id;

-- Copie o ID retornado e use na query abaixo (substitua UUID_AQUI)

INSERT INTO users_profile (id, nome, role, ativo)
VALUES ('UUID_AQUI', 'Admin', 'admin', true);
```

## 5️⃣ Teste a Conexão

```bash
npm run dev
```

Acesse http://localhost:3000 e faça login com:
- Email: `admin@estudio.com`
- Senha: `senha123`

## ✅ Pronto!

Se tudo funcionou, você verá o dashboard! 🎉
