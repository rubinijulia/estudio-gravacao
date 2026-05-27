# Estúdio de Gravação - Sistema de Gestão

Sistema de gestão unificado para estúdio de podcast e produtora de vídeos em São Paulo.

## Stack Técnico

- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript (strict mode)
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth + Google OAuth
- **UI:** Tailwind CSS + shadcn/ui
- **Estado:** Zustand
- **Validação:** Zod + React Hook Form
- **Datas:** date-fns (pt-BR)
- **Gráficos:** Recharts

## Setup Inicial

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Setup

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a URL e a chave anônima
3. Configure as variáveis de ambiente acima
4. Execute os scripts SQL para criar as tabelas

## Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000
