# MULTITENANCY — plano de multiempresa (Fase 5)

**Status: NÃO INICIADO — bloqueado pela decisão P1 (backend) em `docs/project-management/DECISIONS.md`.**
Épica: Issue #5 · cards F5-01..F5-19. Este documento define o alvo; nenhum código deve começar antes da decisão.

Atualizado em: 07/10/2026.

## Realidade atual

- Aplicação 100% local (IndexedDB `opticore-v1`), single-tenant de fato.
- `Store`/`CurrentStoreContext` cuidam da **loja**, não da **empresa**.
- Nenhum registro carrega `organizationId` (grep verificado em 07/10/2026).
- Sessão demo `OWNER` automática (`local-repositories.ts`) — P0 da auditoria.

## Alvo (quando a decisão P1 existir)

1. **Tenant = `organizationId`**; filiais (`storeId`) subordinadas.
   - Preparação local antes do backend: card F1-05 (campo opcional + migração + backup).
2. **Isolamento em três camadas** (F5-04): queries do servidor, endpoints da API e storage de arquivos. Todo caminho com teste negativo automatizado (F8-05).
3. **RLS quando a infra suportar** (F5-06); se não suportar, documentar a alternativa equivalente em vez de fingir cobertura.
4. **Autorização server-side espelhando a matriz local** (F5-05 + `docs/ai/06_PERMISSION_MAP.md`): o guard do frontend nunca é a única barreira.
5. **Sync offline/online** com outbox de eventos UUID, fila com retry e estratégia de conflito por tipo de dado (`OFFLINE_SYNC.md`).
6. **Anexos** com armazenamento escopado por tenant e URL temporária (F5-11); dado clínico nunca em bucket público.
7. **Planos/limites/trial** derivados da decisão comercial P3 (F5-12..15).

## Regras inegociáveis

- Nenhuma listagem/escrita cruza tenants (teste negativo obrigatório).
- Dado clínico nunca aparece em painel administrativo do SaaS sem necessidade comprovada.
- Backup por tenant com restauração testada antes de qualquer produção.
- Logs de auditoria por tenant com retenção definida (F5-18 + F1-10).

## Pré-requisitos locais que já podem ser feitos (não dependem da decisão)

- F1-05 `organizationId` nos registros novos.
- F1-11 escopo por registro aplicado localmente (SELF/STORE/ORG/NETWORK).
- F7-02 login local identificável (encerra OWNER automático).

## Fontes

- `docs/project-management/KANBAN.md` (fase 5), `DEPENDENCIES.md` (cadeia 4/5), `DECISIONS.md` (P1).
- Auditoria: `docs/DEVELOPMENT_AUDIT_A_H.md` (bloqueios P0 de acesso).
