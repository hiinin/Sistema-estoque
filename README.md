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
- [x] Etapa 06: produtos (CRUD completo, validação de EAN/barcode e SKU únicos, cálculo de margem, estoque mínimo, gerador de código de barras, filtros inteligentes)
- [x] Etapa 07: estoque (entradas avulsas, compras/NF com múltiplos itens, perdas/avarias, ajustes de inventário, bloqueio estrito de estoque negativo e auditoria de movimentações com transações atômicas)
- [x] Etapa 08: lotes e validade (controle por lote, categorização automática vencido/7 dias/30 dias/regular, descarte sanitário de lote com baixa em estoque e auditoria)
- [x] Etapa 09: PDV / vendas (frente de caixa rápida, suporte a leitor de código de barras USB com feedback sonoro, carrinho reativo, cálculo de troco, descontos, transações atômicas com baixa em estoque e estorno de cancelamento)
- [x] Etapa 10: dashboard (painel gerencial em tempo real com KPIs de faturamento diário/mensal, lucro estimado, valorização de estoque a custo/venda, gráficos de 7 dias, participação por método de pagamento, top produtos mais vendidos e alertas de reposição urgente)
- [x] Etapa 11: relatórios (emissão e exportação em CSV/impressão para Vendas com margem de lucro, Posição de Estoque com sugestão de compra, Auditoria de Movimentações e Lotes/Validade, além de gestão completa de Clientes)
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
