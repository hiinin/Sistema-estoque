# Sistema de Estoque

Sistema de **gestão de estoque, vendas (PDV com leitor de código de barras), controle de validade e dashboard** para mercados e pequenos comércios.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Vue 3 (Nuxt 4) + Tailwind CSS 4 |
| API | Nitro (rotas em `server/api`), com validação via Zod |
| Banco | PostgreSQL (Supabase em produção, PGlite embutido em desenvolvimento) |
| ORM | Drizzle ORM |
| Deploy | Vercel |

> **Decisão de arquitetura:** o escopo original previa Laravel + MySQL. O projeto foi migrado para Nuxt + PostgreSQL porque o banco é o Supabase (PostgreSQL) e a hospedagem é o Vercel, que não executa PHP nativamente.

## Requisitos

- Node.js 20 ou superior
- Git

## Instalação

```bash
npm install
cp .env.example .env
npm run dev
```

Acesse http://localhost:3000. A rota `/api/health` confirma a conexão com o banco.

## Banco de dados

- **Desenvolvimento:** com `DATABASE_URL` vazio, o projeto usa PGlite (PostgreSQL embutido), gravado em `.data/pglite`. Não é preciso instalar nada.
- **Produção/Supabase:** preencha `DATABASE_URL` com a connection string do **Session pooler** (Connect > Session pooler). A conexão direta do Supabase usa apenas IPv6 e pode falhar no Windows e no Vercel.

> **Nota (Windows):** o `nitro.noExternals` em `nuxt.config.ts` contorna um bug do Nitro com caminhos no Windows (erro "Either manifest or precomputed data must be provided"). O PGlite é carregado por import dinâmico em `server/utils/db.ts` por esse motivo.

## Progresso

- [x] Etapa 01: inicialização (Nuxt, Tailwind, Drizzle, banco, ambiente)
- [x] Etapa 02: arquitetura e banco (schema PostgreSQL/Drizzle, 11 tabelas, índices, FKs, seeders com dados de demonstração)
- [x] Etapa 03: autenticação (login, logout, perfil, permissões por role ADMIN/MANAGER/OPERATOR, middleware de proteção e tela de login com atalhos de demonstração)
- [x] Etapa 04: categorias (CRUD completo, contagem de produtos vinculados, busca em tempo real, proteção estrita contra exclusão indevida)
- [x] Etapa 05: fornecedores (CRUD completo, busca por razão social/CNPJ/e-mail, contatos, preservação de integridade relacional com soft-deactivate)
- [ ] Etapa 06: produtos
- [ ] Etapa 07: estoque
- [ ] Etapa 08: lotes e validade
- [ ] Etapa 09: PDV / vendas
- [ ] Etapa 10: dashboard
- [ ] Etapa 11: relatórios
- [ ] Etapa 12: testes
- [ ] Etapa 13: refinamento (inclui configuração do deploy no Vercel)
- [ ] Etapa 14: documentação final

## Usuários de Demonstração (Seed)

| Perfil | E-mail | Senha |
| --- | --- | --- |
| **Administrador** | `admin@estoque.com` | `admin123` |
| **Gerente** | `gerente@estoque.com` | `gerente123` |
| **Operador de Caixa** | `operador@estoque.com` | `operador123` |

## Melhorias futuras

- Emissão de cupom/recibo para impressão
- Importação de produtos por planilha
