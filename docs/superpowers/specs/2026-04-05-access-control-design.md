# Design: Sistema de Controle de Acesso

## Roles

- **admin** — acesso total: CRUD de coleções/itens/tags, upload em lote, classificação IA, gerenciamento de usuários
- **viewer** — somente leitura: visualizar coleções/itens, pesquisar (texto, tags, imagem)

## Autenticação

- Supabase Auth com email + senha
- Tela de login própria (`/login`)
- Sem auto-cadastro — somente admin cria contas
- Admin pode definir senha provisória; usuário troca no primeiro login via flag `must_change_password`
- Tela de troca de senha obrigatória quando flag está ativa

## Seed do Admin

- Usuário inicial: Raphael Bigio, `rapahel@dryko.com.br`, senha `Mudar1234!`, role `admin`
- Criado via edge function ou script manual

## Banco de Dados

Tabela `profiles` (vinculada ao `auth.users`):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK, FK → auth.users | ID do usuário |
| name | text | Nome do usuário |
| email | text | Email |
| role | text ('admin' \| 'viewer') | Papel no sistema |
| must_change_password | boolean, default true | Força troca de senha no primeiro login |
| created_at | timestamptz | Data de criação |

### RLS

- `collections`, `items`, `photos`, `tags`, `item_tags`: SELECT para todos autenticados, INSERT/UPDATE/DELETE apenas para admin
- `profiles`: SELECT próprio para viewer, CRUD completo para admin

## Frontend

### Novos componentes

- `LoginPage.tsx` — formulário email + senha
- `ChangePasswordPage.tsx` — tela de troca de senha obrigatória
- `AdminUsersPage.tsx` — página `/admin/users` com lista de usuários, criar e excluir

### Alterações

- `App.tsx` — rotas protegidas, redirect para `/login` se não autenticado
- Header — esconder botões de ação para viewers; mostrar ícone de admin para admins
- `ItemPage.tsx` — esconder edição/exclusão para viewers
- `TagsPage.tsx` — esconder criação/edição/exclusão para viewers

### Auth context

- `AuthProvider` + `useAuth` hook: `user`, `profile` (com role), `signIn`, `signOut`, `isAdmin`

## Fluxo

1. Usuário acessa app → se não logado, redirect para `/login`
2. Login com email + senha
3. Se `must_change_password` → redirect para `/change-password`
4. Se viewer → vê tudo read-only (sem botões de ação)
5. Se admin → acesso completo + link para `/admin/users`
