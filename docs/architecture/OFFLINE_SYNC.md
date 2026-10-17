# OFFLINE SYNC — plano de sincronização offline/online

**Status: NÃO INICIADO — bloqueado pela decisão P1 (backend).** Épica #5 · cards F5-07, F5-08, F5-09, F7-19.
A interface `SyncEngine` **não deve ser ativada** antes da decisão (auditoria A: "preparar, não ativar").

Atualizado em: 07/10/2026.

## Realidade atual (offline-first local)

- PWA com service worker e precache (`vite.config.ts` / `src/main.tsx`); persistência real = IndexedDB.
- Toda a operação do dia funciona sem rede; **não há** fila de sincronização, `outbox`, `fetch` ou `axios` no código (grep verificado em 07/10/2026).
- O que falta provar (Fluxo 5 da auditoria): instalação/reabertura offline em aparelho real, anexos duráveis, quota cheia e gravação negada com feedback — cards F8-04, F3-09, F1-12.

## Alvo quando o backend existir

1. **Outbox local (F5-08):** cada mutação gera evento com UUID, entidade, payload e `createdAt`; estado visível ao usuário (F7-19).
2. **Envio (F5-07):** fila com retry/backoff, ordem preservada por entidade, indicador online/offline/pendente.
3. **Conflitos (F5-09):** estratégia por tipo de dado —
   - registros "append-only" (movimentos, lançamentos): nunca conflitam;
   - registros editáveis (cliente, produto): última escrita com carimbo, exceto **dado clínico**, que gera flag de conflito para revisão humana (nunca merge automático de prontuário).
4. **Servidor como autoridade** de saldo/estoque/caixa quando online; offline, as regras locais transacionais (já existentes) continuam valendo.

## Regras

- Nenhuma ativação de sync sem: decisão P1, testes de fila offline (F5-08), testes multiempresa (F8-05) e indicador de estado (F7-19).
- Usuário nunca vê "sincronizado" sem confirmação do servidor.
- Falha de sync não perde dado local nem duplica registro (teste obrigatório).

## Fontes

- `docs/project-management/KANBAN.md` (F5-07..09, F7-19, F8-04), `DEPENDENCIES.md` (cadeia 5).
- `docs/ai/07_DATA_FLOW.md` (fluxo atual), auditoria (seção A — "Sync preparado").
