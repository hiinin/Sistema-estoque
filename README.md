# 📦 Sistema de Gestão de Estoque & Frente de Caixa (PDV)

Sistema web completo, profissional e funcional de **gestão de estoque, controle de vendas (PDV com suporte a leitor de código de barras USB), monitoramento de validade/lotes e relatórios gerenciais**, desenvolvido para supermercados, mercearias, lojas e comércios em geral.

---

## 🚀 Tecnologias & Arquitetura

| Camada | Tecnologia | Detalhes |
| :--- | :--- | :--- |
| **Frontend** | Vue 3 · Nuxt 4 · Tailwind CSS 4 | Interface reativa, moderna, desktop-first para PDV e responsiva para tablets e smartphones |
| **Ícones & UI** | Lucide Icons · Web Audio API | Ícones contextuais e feedback sonoro realista de bip para leitura de código de barras |
| **Backend & API** | Nitro Engine (Nuxt Server Routes) | Endpoints tipados com validação estrita via **Zod** |
| **Banco de Dados** | PostgreSQL (Supabase / PGlite) | Conexão de produção no Supabase via Transaction/Session Pooler e PGlite embutido para desenvolvimento local |
| **ORM & Migrações**| Drizzle ORM | Consultas tipadas, relacionamentos declarativos e transações atômicas com `db.transaction()` |
| **Autenticação** | Jose (JWT em Cookie HttpOnly Seguro) | Sessões criptografadas com controle de permissões por nível (`ADMIN`, `MANAGER`, `OPERATOR`) |
| **Testes** | Node.js Test Runner + TSX | Suíte automatizada cobrindo todas as regras de negócio críticas |
| **Hospedagem** | Vercel Serverless Functions | Configurado com preset Vercel via `vercel.json` |

> 💡 **Nota de Decisão Arquitetural:** O projeto utiliza Nuxt 4 com PostgreSQL (Supabase) e deploy no Vercel, garantindo compatibilidade nativa com nuvem serverless e máxima velocidade de resposta.

---

## ✨ Principais Funcionalidades

### 🛒 1. Frente de Caixa / PDV (Ponto de Venda)
* **Leitura de Código de Barras USB:** Suporta leitores ópticos/laser emuladores de teclado USB. Ao ler o código de barras (EAN-13), o produto é adicionado imediatamente com toque sonoro de bip.
* **Busca Híbrida:** Pesquisa instantânea por nome do produto, SKU ou código de barras com seleção por clique ou teclado.
* **Atalhos de Teclado Rápidos:**
  * `F2`: Focar imediatamente no campo de busca/código de barras.
  * `F4`: Abrir tela de finalização de pagamento.
  * `F9`: Cancelar carrinho e reiniciar venda.
* **Cálculo Automático de Troco:** Cálculo dinâmico para pagamentos em dinheiro com validação de valor recebido.
* **Múltiplas Formas de Pagamento:** Dinheiro, PIX, Cartão de Crédito e Cartão de Débito.
* **Transações Atômicas:** Baixa de estoque simultânea e geração de auditoria com garantia de consistência (rollback automático em caso de falha).
* **Cancelamento e Estorno de Vendas:** Cancelamento de vendas concluídas com devolução automática dos itens ao estoque e registro de estorno (`RETURN`).
* **Emissão de Cupom Não Fiscal:** Modal de comprovante com opção de impressão direta.

### 💼 2. Controle de Caixa & Turnos (Novo)
* **Abertura de Caixa:** Registro obrigatório do operador com valor de fundo de troco inicial.
* **Sangrias (Retiradas Seguras):** Registro justificado de retirada de dinheiro para cofre com validação de saldo físico na gaveta.
* **Suprimentos (Reforço de Troco):** Inclusão de cédulas/moedas com auditoria.
* **Fechamento de Caixa com Conferência Cega:** Apuração física do dinheiro na gaveta com cálculo automático instantâneo de **Quebra de Caixa** (falta) ou **Sobra de Caixa** (excedente).
* **Vinculação Direta com o PDV:** Todas as vendas em dinheiro alimentam a gaveta em tempo real e se vinculam à sessão ativa.

### 📦 3. Gestão de Produtos & Catálogo
* Cadastro completo com **SKU único**, **Código de Barras (EAN-13)**, preço de custo, preço de venda e unidade de medida.
* Cálculo automático de **Margem de Lucro (%)** e **Lucro Bruto (R$)** em tempo real.
* Configuração de **Estoque Mínimo** e **Estoque Máximo** com alertas visuais.
* **Importação em Lote via Planilha CSV:** Carregamento de catálogos inteiros com detecção inteligente de colunas, criação dinâmica de categorias e validação com preview.
* **Exportação Completa para CSV:** Download de todo o catálogo com codificação UTF-8 e compatibilidade nativa com Microsoft Excel.
* **Gerador & Impressão de Etiquetas:** Criação de etiquetas com código de barras em SVG puro (Code 128) nos padrões **Gôndola (Supermercado / Preço grande)** e **Adesivo de Produto (Compacto)** com suporte a `@media print`.

### 🏷️ 4. Controle de Lotes & Validade
* Controle detalhado por número de lote, data de fabricação e data de expiração.
* **Categorização visual inteligente de vencimento:**
  * 🔴 **Vencido:** Validade expirada.
  * 🟠 **Urgente:** Vence em até 7 dias (ação de queima/promoção).
  * 🟡 **Atenção:** Vence em até 30 dias.
  * 🟢 **Regular:** Validade segura superior a 30 dias.
* Ação de **Descarte Sanitário:** Baixa do lote com dedução do estoque do produto e auditoria de perda (`LOSS`).

### 🔄 5. Movimentações de Estoque & Auditoria Total
* **Entrada Avulsa (`ENTRY`):** Inclusão manual de itens.
* **Compras de Fornecedor / NF (`PURCHASE`):** Entrada de múltiplos itens com vínculo a fornecedor e número de nota fiscal.
* **Perdas e Avarias (`LOSS`):** Baixa justificada por quebra, dano ou validade.
* **Ajustes de Inventário (`ADJUSTMENT`):** Correções após contagem física.
* **Vendas no PDV (`SALE`):** Baixa automática no ato da compra.
* **Estorno de Cancelamento (`RETURN`):** Devolução ao estoque após cancelamento de cupom.
* **Bloqueio Rigoroso de Estoque Negativo:** O sistema impede qualquer saída superior ao saldo existente no banco de dados.

### 📊 6. Dashboard Gerencial em Tempo Real
* Indicadores diários (Faturamento hoje, total de cupons, ticket médio e unidades vendidas).
* Indicadores mensais acumulados e lucro bruto estimado.
* Valorização total do estoque a preço de custo e preço de venda projetado.
* Gráfico de vendas dos últimos 7 dias.
* Distribuição percentual por método de pagamento.
* Ranking dos 5 produtos mais vendidos.
* Painel de reposição urgente com itens abaixo do estoque mínimo.

### 📑 7. Relatórios & Inteligência de Negócio
* Relatórios completos com filtros por período, categoria, fornecedor e forma de pagamento:
  * **Relatório de Vendas & Faturamento**
  * **Relatório de Posição de Estoque & Sugestão de Compra**
  * **Relatório de Auditoria de Movimentações**
  * **Relatório de Lotes e Controle de Validade**
* **Exportação para CSV:** Arquivo formatado com separador padrão `;` e codificação UTF-8 com BOM (compatibilidade nativa com Microsoft Excel).
* **Impressão / PDF:** Layout limpo e otimizado via CSS Print (`@media print`).

### 👥 8. Gestão de Clientes e Fornecedores
* Cadastro de Clientes (CPF, WhatsApp, e-mail) para vínculo no PDV.
* Cadastro de Fornecedores com CNPJ, contatos e endereço.
* Proteção contra exclusão indevida (soft-deactivate e restrição de integridade referencial).

### ⚡ 9. UX & Produtividade: Paleta de Comandos & Toasts
* **Command Palette Global (`Ctrl+K` ou `Cmd+K`):** Busca instantânea por qualquer módulo, produto ou ação rápida sem tirar as mãos do teclado.
* **Sistema Global de Toasts:** Notificações flutuantes animadas com feedback de sucesso, alerta, erro e informação em todas as operações.

---

## 🗄️ Estrutura do Banco de Dados (13 Tabelas)

```
users (id, name, email, password, role, active, created_at, updated_at)
categories (id, name, description, active, created_at, updated_at)
suppliers (id, name, cnpj, phone, email, address, active, created_at, updated_at)
customers (id, name, cpf, phone, email, created_at, updated_at)
products (id, sku, barcode, name, description, category_id, supplier_id, cost_price, sale_price, current_stock, minimum_stock, maximum_stock, unit, active, created_at, updated_at)
product_batches (id, product_id, batch_number, initial_quantity, current_quantity, cost_price, manufacturing_date, expiration_date, active, created_at, updated_at)
purchases (id, code, supplier_id, user_id, total, invoice_number, notes, created_at, updated_at)
purchase_items (id, purchase_id, product_id, quantity, cost_price, subtotal, batch_number, manufacturing_date, expiration_date, created_at)
cash_registers (id, user_id, status, opening_amount, closing_amount, expected_amount, difference_amount, notes, opened_at, closed_at, created_at, updated_at)
cash_movements (id, cash_register_id, user_id, type, amount, payment_method, description, created_at)
sales (id, code, user_id, cash_register_id, customer_id, subtotal, discount, total, payment_method, status, notes, created_at, updated_at)
sale_items (id, sale_id, product_id, batch_id, quantity, unit_price, cost_price, subtotal, created_at)
stock_movements (id, product_id, batch_id, user_id, type, quantity, previous_stock, new_stock, unit_cost, reference_id, reason, created_at)
```

---

## 🔐 Usuários de Demonstração (Seed)

O banco já vem previamente abastecido com dados de teste e usuários para os 3 níveis de acesso:

| Perfil | E-mail | Senha | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@estoque.com` | `admin123` | Acesso total a todos os módulos, configurações e usuários |
| **Gerente** | `gerente@estoque.com` | `gerente123` | Acesso a estoque, lotes, produtos, relatórios e PDV |
| **Operador de Caixa** | `operador@estoque.com` | `operador123` | Acesso à frente de caixa (PDV) e consulta de catálogo/clientes |

> *A tela de login conta com botões de 1 clique para preenchimento rápido de cada perfil.*

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
* **Node.js 20+** instalado
* **Git**

### 1. Clonar o repositório
```bash
git clone https://github.com/hiinin/Sistema-estoque.git
cd Sistema-estoque
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie o arquivo `.env` a partir do `.env.example`:
```bash
cp .env.example .env
```

* **Modo Desenvolvimento Local (Sem instalar banco):** Deixe `DATABASE_URL` vazio. O sistema usará o **PGlite** (PostgreSQL embutido em arquivo local).
* **Modo Supabase:** Insira a connection string do Supabase Session Pooler (porta 5432).

### 4. Executar o Seeder de demonstração (Opcional)
```bash
npm run db:seed
```

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Executando os Testes Automatizados

O projeto conta com suíte automatizada de testes cobrindo todas as regras de negócio críticas:

```bash
npm test
```

---

## 🌐 Deploy no Vercel

1. Importe o repositório no painel do [Vercel](https://vercel.com).
2. Configure as variáveis de ambiente em **Settings > Environment Variables**:
   * `DATABASE_URL`: Connection string do **Session Pooler** do Supabase (ex: `postgresql://postgres.[REF]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres`).
   * `NUXT_SESSION_SECRET`: Uma string aleatória longa para assinatura dos tokens JWT.
3. O Vercel executará automaticamente `npm run build` e fará o deploy serverless.

---

## 🗺️ Roadmap de Etapas Concluídas

- [x] **Etapa 01:** Inicialização (Nuxt, Tailwind 4, Drizzle ORM, PGlite/Postgres)
- [x] **Etapa 02:** Arquitetura e banco de dados (13 tabelas, índices, FKs, Seeder)
- [x] **Etapa 03:** Autenticação e Perfis (JWT HttpOnly, Guards ADMIN/MANAGER/OPERATOR)
- [x] **Etapa 04:** Categorias de Produtos (CRUD e integridade referencial)
- [x] **Etapa 05:** Fornecedores (CRUD, busca, validações e soft-deactivate)
- [x] **Etapa 06:** Produtos e Catálogo (SKU/EAN únicos, margem de lucro, alertas)
- [x] **Etapa 07:** Gestão de Estoque (Entradas, compras NF, perdas, ajustes e bloqueio de saldo negativo)
- [x] **Etapa 08:** Lotes e Validades (Monitoramento por cores, descarte sanitário com auditoria)
- [x] **Etapa 09:** Frente de Caixa / PDV (Leitor USB, bip sonoro, atalhos F2/F4/F9, troco e checkout atômico)
- [x] **Etapa 10:** Dashboard Gerencial (KPIs em tempo real, gráficos de faturamento e ranking)
- [x] **Etapa 11:** Relatórios e Clientes (Vendas com margem, estoque com sugestão de compra, exportação CSV e impressão)
- [x] **Etapa 12:** Suíte de Testes Automatizados (Validações e regras de negócio)
- [x] **Etapa 13:** Refinamento e Deploy (Configurações Vercel, responsividade e polimento de UX)
- [x] **Etapa 14:** Documentação Arquitetural e Funcional
- [x] **Etapa 15:** Controle de Caixa & Turnos (Abertura, Sangria, Suprimento e Fechamento com conferência de quebra/sobra)
- [x] **Etapa 16:** Gerador de Etiquetas Code 128 (SVG) e Importação/Exportação CSV em lote
- [x] **Etapa 17:** Command Palette Global (`Ctrl+K`) e Sistema Reativo de Toasts

---

## 📄 Licença

Este projeto foi desenvolvido para fins profissionais e de demonstração de portfólio. Livre para uso e customizações comerciais.
