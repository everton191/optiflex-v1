# SECURITY PLAN — plano de segurança

**Status:** base parcial existente (permissões + transações); lacunas P0 documentadas.
Cartões: F1-10, F1-11, F7-02, F8-07, F8-08 + F5-02/04/05/11/18 (bloqueados com a Fase 5).

Atualizado em: 07/10/2026 · Base: `d6ab1d4`.

## Ativos a proteger

1. Dado clínico (prontuário, anexos, prescrições) — sensível por excelência.
2. Dado financeiro (vendas, caixa, parcelas).
3. Integridade operacional (estoque, caixa — operação duplicada = prejuízo direto).
4. Credenciais futuras (certificado fiscal A1, chaves de API — F6-10/F6-18).

## Estado atual verificado (07/10/2026)

| Controle | Estado | Evidência/card |
|---|---|---|
| Matriz de 10 perfis + guards de rota (`Can`, `RequirePermission`) | PARCIAL | `src/domain/access.ts`, `access.test.ts` (F1-11) |
| Escopo por registro (SELF/STORE/ORG/NETWORK) | AUSENTE (P0) | F1-11, F2-05 |
| Identidade/sessão (login, sair, expiração) | AUSENTE (P0) — OWNER demo automático | F7-02 (READY, P0) |
| Integridade transacional (venda/estoque/caixa/OS) | OK + testes | `sale-stock.test.ts`, `cash*.test.ts`, `work-orders.test.ts` |
| Idempotência de recebimento | OK | `cash-service.test.ts` |
| Backup/restauração local | PARCIAL | `backup.test.ts` (anexos pendentes: F3-09/F8-10) |
| Log de auditoria (autor/data/ação/motivo) | AUSENTE | F1-10 |
| Tratamento global de erros | AUSENTE (risco de tela branca/dado silencioso) | F1-12 |
| Segredos/credenciais | N/A (nenhuma credencial no repo — manter assim) | F6-18 quando existir fiscal |
| Isolamento multiempresa | N/A (single-tenant local) | `MULTITENANCY.md` |
| LGPD | NÃO VERIFICADO (jurídico externo) | F8-08 bloqueado |

## Prioridades (ordem de ataque)

1. **P0:** F7-02 login local → F1-11 escopo por registro → F3-09 conteúdo real de anexos → F1-12 erros globais.
2. **P0:** preservar atomicidade já construída (nenhuma alteração em `confirm`/`applyStockMovement` sem teste de concorrência).
3. **P1:** F1-10 auditoria de alterações → F4-18 estornos auditados → F8-06 testes de permissões → F8-07 auditoria de segurança.
4. **P1/Fase 5:** autenticação real, policies server-side, storage de anexos, logs por tenant.
5. **P2:** F8-08 LGPD (jurídico), F6-18 cofre de segredos.

## Regras permanentes

- Nunca expor anamnese a perfil não clínico (regra de fronteira em `MODULE_BOUNDARIES.md`).
- Nunca logar/imprimir segredo, senha ou certificado.
- Guard do frontend nunca é a única barreira quando houver backend.
- Varredura de segredos antes de cada release (`RELEASE_CHECKLIST.md` item 0).
- Dados demo claramente separados de operação real.

## Fontes

- `docs/ai/06_PERMISSION_MAP.md` (matriz real de permissões).
- `docs/DEVELOPMENT_AUDIT_A_H.md` (bloqueios P0 de acesso/prontuário/recuperação).
- `docs/project-management/KANBAN.md` (cards P0) · `DECISIONS.md` (P8 demo).
