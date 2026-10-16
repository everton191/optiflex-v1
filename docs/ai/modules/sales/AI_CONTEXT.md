# AI CONTEXT — Sales

## Current Status

- PDV guiado no `/caixa` (F3-11): filtro de categoria (FRAME/LENS/ACCESSORY) no seletor de itens, tratamentos por venda e medidas da receita importadas no formulário (sem redigitação).
- `Sale.items?` guarda `{ inventoryItemId, name, quantity, unitPrice, category? }`; `Sale.treatments?` guarda `{ name, price }` (serviços, sem baixa de estoque).
- Confirmação transacional (`LocalSaleRepository.confirm`) muda para `CONFIRMED` **e** baixa o saldo gerando movimentos `OUT` na mesma transação — tratamentos **não** geram movimento.
- Venda confirmada pode gerar ordem de serviço; o detalhe da OS mostra card "Venda" (itens com categoria + tratamentos) e "Prescrição" (graus + medidas), tudo copiado da venda, sem redigitação.

## Current Decisions

- Sem linhas (itens nem tratamentos): total e descrição são digitados; a confirmação não toca no estoque.
- Com linhas: total = soma em centavos de itens + tratamentos; descrição (quando vazia) junta nomes de itens e tratamentos.
- Preço unitário é digitado por venda (ainda sem catálogo de preços); `defaultPrice` do produto pré-preenche o campo.
- Tratamento é serviço configurado no momento da venda (nome + preço); não baixa estoque e não decide tratamento clínico automaticamente (fora de escopo da issue).
- Categoria do item vem do produto do estoque (`InventoryItem.category`) e é validada (`Categoria do item inválida.`); itens antigos sem categoria continuam válidos.
- Medidas da receita: quando o orçamento vincula uma prescrição, o snapshot (`SalePrescription.measures`, F3-08) carrega DP/alturas e o formulário mostra as medidas importadas em modo leitura.
- Campos novos (`category`, `treatments`) são opcionais e sem índice → sem bump de versão Dexie; backup valida `treatments` (nome/preço) e `category` dos itens.
- `SaleRepository.confirm(sale, movements)` é a única porta de confirmação; `save` não confirma venda.

## Known Problems

- Não há catálogo/preços no estoque (preço unitário é digitado a cada venda).
- Tratamentos não têm catálogo por loja (configurável = nome + preço na própria venda).
- Rota usa `cash.read`, exigindo essa permission para seller.

## Pending Work

- Catálogo com preço padrão por produto.
- Cancelamento com devolução de estoque já estorna via caixa; falta tratar venda paga devolvida em regra própria.

## Important Files Right Now

- `CashDeskPage`/`SaleDocumentPage` em `src/app/CashWorkspace.tsx` (form guiado `.sale-items-form`, `.sale-treatments-form`, documento com tabela de tratamentos).
- `src/domain/sales-service.ts` (`buildQuote` valida itens + tratamentos e soma os dois; `confirm` revalida preços).
- `src/domain/sales.ts` (`SaleItem.category`, `SaleTreatment`, `assertValidSaleItems`, `assertValidSaleTreatments`, `treatmentsTotalCents`, `stockMovementsFor`).
- `src/domain/backup.ts` (validação de `items.category` e `sales.treatments`).
- `LocalSaleRepository.confirm` + `applyStockMovement` em `local-repositories.ts`.

## Recent Structural Changes

- F3-11 `3dc784c`: categoria no item, `Sale.treatments` (total/descrição/backup) e medidas da receita importadas no PDV; card "Venda" na OS.
- F3-08 `ad8f5be`: `Prescription.measures` no snapshot da venda e na OS.
- Fase E: venda → estoque atômica (confirmação + movimento `OUT` na mesma transação).

## Be Careful With

- CashDeskPage também serve cash e work-orders.
- Não chamar `repository.save` para mudar status de QUOTE para CONFIRMED; usar sempre `confirm`.
- Tratamentos não entram em `stockMovementsFor` — manter assim (baixa de estoque só nos itens de estoque).
- O seletor de itens carrega produtos para quem tem `sales.manage`, mesmo sem `inventory.read` (leitura pontual; a tela de estoque continua protegida).

## Next Likely Task

Fila do KANBAN: F3-16 acompanhamento da fabricação (`#154`).
