# 💰 Cofrinho — Controle de gastos para estudantes

Aplicativo mobile desenvolvido em **React Native + Expo** para a disciplina de
**Desenvolvimento Mobile II** (1º Bimestre).

## 📌 Problema

Estudantes que vivem com mesada, bolsa ou salário de estágio costumam gastar
aos poucos (lanche, ônibus, xerox, lazer) e, no fim do mês, não sabem para onde
o dinheiro foi. Planilhas são chatas de usar no celular e muitos apps de
finanças são complexos demais para esse público.

## 💡 Solução

O **Cofrinho** permite registrar cada gasto em poucos segundos, ver o total
gasto e um resumo por categoria. Os dados ficam salvos no celular (funciona sem
internet) e são sincronizados com a nuvem quando há conexão.

## ✅ Funcionalidades

- Cadastro de gastos (descrição, categoria e valor)
- Lista de gastos com o total geral
- Resumo por categoria com quantidade e porcentagem do total
- Funciona offline (dados salvos no SQLite)
- Sincronização automática e manual com o Supabase
- Indicador de status de cada gasto: **Pendente** ou **Na nuvem**

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| React Native + Expo (SDK 54) | Desenvolvimento do app mobile |
| TypeScript | Tipagem do código |
| Expo SQLite | Banco de dados local no celular |
| Supabase (PostgreSQL) | Banco de dados na nuvem |
| Supabase Auth (anônimo) | Identificação do usuário sem cadastro |
| Row Level Security (RLS) | Cada usuário acessa só os próprios dados |
| expo-crypto | Geração de UUIDs (`sync_id`) |

## 🧱 Arquitetura

```
[ Tela (App.tsx) ]
        │  salva primeiro
        ▼
[ SQLite (cofrinho.db) ]  ← funciona sem internet
        │  registros "pending"
        ▼
[ sync.ts ] ── upsert ──► [ Supabase / PostgreSQL ]
        ◄── select ──────
```

- **Front-end:** `App.tsx`, com componentes `View`, `Text`, `TextInput`,
  `Pressable` e `FlatList`, estado com `useState` e navegação simples por estado.
- **Local:** `src/database.ts` cria a tabela e faz INSERT/SELECT com
  `execAsync`, `runAsync` e `getAllAsync`.
- **Back-end:** Supabase com tabela `gastos`, autenticação anônima e políticas RLS.
- **Sincronização:** `src/sync.ts` envia os gastos pendentes, marca como
  sincronizados e baixa os dados da nuvem sem duplicar (upsert por `sync_id`).

## 📁 Estrutura do projeto

```
cofrinho/
├── .env.example
├── App.tsx
├── app.json
├── index.ts
├── package.json
├── supabase.sql
├── tsconfig.json
├── assets/
└── src/
    ├── database.ts   # SQLite
    ├── supabase.ts   # cliente Supabase e sessão anônima
    ├── sync.ts       # sincronização
    └── types.ts      # tipos TypeScript
```

## ▶️ Como rodar

### Pré-requisitos
- [Node.js](https://nodejs.org) (versão LTS)
- [Visual Studio Code](https://code.visualstudio.com)
- Conta gratuita no [Supabase](https://supabase.com)
- App **Expo Go** instalado no celular (Play Store / App Store)

### 1. Clonar e instalar
```bash
git clone https://github.com/SEU-USUARIO/cofrinho.git
cd cofrinho
npm install
```

### 2. Configurar o Supabase
1. Crie um novo projeto no Supabase.
2. Em **Authentication > Sign In / Providers**, habilite **Allow anonymous sign-ins**.
3. Em **SQL Editor > New query**, cole o conteúdo de `supabase.sql` e execute.
4. Em **Project Settings > API** (ou botão **Connect**), copie a **Project URL**
   e a **Publishable key**.

### 3. Variáveis de ambiente
Crie um arquivo `.env.local` na raiz (pode copiar o `.env.example`):
```
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
> ⚠️ Nunca use a `service_role key` no app. O `.env.local` já está no `.gitignore`.

### 4. Executar
```bash
npx expo start --clear --tunnel
```
Leia o QR Code com o **Expo Go**.

## 🧪 Como testar

**SQLite (local):**
1. Ative o modo avião.
2. Cadastre um gasto (ele aparece como **Pendente**).
3. Feche o app e abra de novo: o gasto continua lá.

**Supabase (nuvem):**
1. Desative o modo avião e toque em **Sincronizar**.
2. O gasto muda para **Na nuvem**.
3. No painel do Supabase, confira a tabela `gastos` no **Table Editor** e o
   usuário anônimo em **Authentication > Users**.

## ⚠️ Limitações

- Ainda não é possível editar ou excluir gastos.
- Como o login é anônimo, desinstalar o app ou limpar os dados cria um novo
  usuário e os gastos antigos não são recuperados.
- A funcionalidade de visão computacional será implementada no 2º bimestre.

## 👥 Integrantes

- Otávio Salomão
- Lucas Abrahão
- Joâo Pucci
- Matheus Ferrarezi
