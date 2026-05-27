# Supabase Setup Instructions

## Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Crie um novo projeto
4. Anote a URL e a chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## Passo 2: Configurar Variáveis de Ambiente

Adicione as variáveis ao arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

## Passo 3: Executar Scripts SQL

### 3.1 Criar Schema e Tabelas

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Copie todo o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Cole na query
5. Clique em **Run**

### 3.2 Configurar RLS Policies

1. Crie uma nova query
2. Copie todo o conteúdo de `supabase/migrations/002_rls_policies.sql`
3. Cole na query
4. Clique em **Run**

## Passo 4: Configurar Autenticação

### Email/Senha

1. Vá em **Settings > Authentication**
2. Habilite "Email" se ainda não estiver
3. Configure os templates de email (opcional por enquanto)

### Google OAuth (Opcional por enquanto)

1. Vá em **Settings > Authentication > Providers**
2. Clique em Google
3. Siga as instruções para configurar as credenciais Google
4. Adicione `http://localhost:3000/auth/callback` como redirect URL

## Passo 5: Criar Usuário de Teste

1. Vá em **SQL Editor**
2. Execute uma query para inserir um usuário de teste:

```sql
-- Insira um usuário via Auth (será criado manualmente no dashboard)
-- Depois use esta query para criar seu perfil:

INSERT INTO users_profile (id, nome, role, ativo)
SELECT 
  id,
  email as nome,
  'admin'::user_role,
  true
FROM auth.users
WHERE email = 'seu@email.com'
ON CONFLICT (id) DO NOTHING;
```

## Passo 6: Testar Conexão

1. No terminal, execute:
```bash
npm run dev
```

2. Acesse http://localhost:3000
3. Você deve ser redirecionado para `/auth/login`
4. Tente fazer login com suas credenciais

## Próximos Passos

Após confirmar que tudo está funcionando:
- [ ] Implementar CRUD de clientes
- [ ] Implementar CRUD de serviços  
- [ ] Implementar módulo de vendas
- [ ] Implementar agenda
- [ ] Etc...

## Troubleshooting

**Erro: "No rows returned"** quando faz login
- Verifique se o usuário está criado em `auth.users`
- Verifique se há um registro correspondente em `users_profile`

**Erro: RLS violation**
- Confirme que as policies foram criadas corretamente
- Verifique se o usuário tem a role correta em `users_profile`

**Erro: "NEXT_PUBLIC_SUPABASE_URL is not set"**
- Confirme que `.env.local` existe na raiz do projeto
- Reinicie o servidor dev (`npm run dev`)
