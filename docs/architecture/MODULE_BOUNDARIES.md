# MODULE BOUNDARIES — limites entre módulos

**Não duplica:** a lista real de módulos, rotas e arquivos vive em `docs/ai/03_MODULE_INDEX.md`, `04_ROUTE_MAP.md` e `09_CHANGE_IMPACT_MAP.md`. Aqui ficam as **regras de fronteira** (quem pode chamar quem).

Atualizado em: 07/10/2026.

## Regra fundamental

```text
Page (src/app/*Workspace.tsx | pages.tsx)
  → Service (src/domain/*-service.ts)      regras de negócio
    → Repository (contratos em src/domain/repositories.ts)
      → Local*Repository (src/infrastructure/storage/local-repositories.ts)
```

- Páginas **nunca** acessam Dexie diretamente (`AGENTS.md`).
- Services **não** importam React, CSS nem Dexie.
- Um service pode compor outros services do domínio (ex.: `CashService` orquestra `SalesService` e `WorkOrderService`), mas repositories só são injetados na composição (hoje em `pages.tsx`).

## Fronteiras por módulo (resumo)

| Módulo | Pode depender de | Não deve importar |
|---|---|---|
| `access` | providers/sessão | detalhe de qualquer módulo |
| `administration` | access, storage | clínica, vendas |
| `customers` | storage, access | clinical (conteúdo), cash |
| `attendance` | customers, store context | cash, inventory |
| `clinical` | attendance, customers | cash, inventory (vendas) |
| `sales` | customers, inventory, cash | clinical (anamnese — só dados ópticos permitidos) |
| `work-orders` | sales, customers, inventory | clinical (conteúdo clínico) |
| `inventory` | store context, sessão | sales (o helper de estoque vive na infra, não no service de venda) |
| `cash` | sales, customers, work-orders | clinical |
| `dashboard` | todos (somente leitura via seletores) | escrita em qualquer store |

## Fronteiras críticas (não violar)

1. **Dado clínico:** `ClinicalRecord`/anamnese só pelos perfis com `clinical.workspace.access`; vendedor/recepção recebem apenas dados ópticos necessários (`docs/ai/06_PERMISSION_MAP.md`).
2. **Estoque:** saldo só muda via `applyStockMovement` (transação), nunca gravação direta de `quantity`.
3. **Venda:** status só muda via `SaleRepository.confirm` (não `save`).
4. **OS:** transições só via `WorkOrderRepository.update(order, expectedStatus)`.
5. **Backup:** qualquer modelo persistido precisa de validação em `backup.ts` (senão exporta/importa quebrado).

## Evolução prevista

- Extração incremental de `pages.tsx` em `*Workspace.tsx` (card F1-03) — mover sem reescrever.
- Instanciação central de repositories (hoje por página) — melhoria registrada em F1-04.
- Pastas físicas de módulo (`src/modules/`) **não existem**; não criá-las sem card aprovado.
- Fronteiras fiscais/SaaS (F6/F5): adapters de provedor fora do domínio (`docs/architecture/MULTITENANCY.md`).
