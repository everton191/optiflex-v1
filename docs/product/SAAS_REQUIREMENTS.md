# SAAS REQUIREMENTS — requisitos do SaaS multiempresa (Fase 5 + comercial)

**Status: NÃO INICIADO — bloqueado pelas decisões P1 (backend) e P3 (modelo comercial) em `docs/project-management/DECISIONS.md`.**
Épica #5 · cards F5-01..F5-19 · F8-16. Visão técnica de isolamento: `docs/architecture/MULTITENANCY.md`; sync: `OFFLINE_SYNC.md`.

Atualizado em: 07/10/2026.

## 1. Plataforma

- Backend em nuvem com autenticação real (sem OWNER demo), organizações/filiais como tenants, isolamento verificado por teste negativo (F5-01..06).
- Offline/online com fila e resolução de conflitos (F5-07..09); indicador de estado na UI (F7-19).
- Backup/restore por tenant (F5-10) + armazenamento seguro de anexos (F5-11).
- Monitoramento de incidentes (F5-17), logs de auditoria por tenant (F5-18), recuperação de conta (F5-19).

## 2. Comercial (bloqueio P3 — a definir pelo dono do produto)

| Item | Card | O que precisa ser decidido |
|---|---|---|
| Planos e limites | F5-12, F5-15 | Quais planos, o que varia (usuários, lojas, storage), preço. |
| Assinaturas e cobrança | F5-13 | Provedor de cobrança, moeda, falha de pagamento = corte quando? |
| Período de teste | F5-14 | Duração, limites do trial, conversão automática. |
| Políticas comerciais | F8-16 | Termos de uso, política de privacidade, cancelamento/reembolso. |
| Painel do SaaS | F5-16 | Quem opera, quais dados podem ser vistos sem violar LGPD. |

## 3. Conformidade

- **LGPD/Dado pessoal e clínico:** verificação com apoio jurídico (F8-08, bloqueio P6): base legal por finalidade, minimização, retenção, direitos do titular, exclusão/anonimização.
- Auditoria e logs preservam autor/loja/dispositivo/motivo sem expor dado clínico indevido.
- Dados demo separados de operação real (DECISIONS P8).

## 4. Critérios de "pronto" para abrir SaaS

1. Decisões P1 e P3 registradas.
2. Isolamento de tenant com teste automatizado (F8-05).
3. LGPD verificada (F8-08) e auditoria de segurança executada (F8-07).
4. Backup/restauração de nuvem testados (F5-10).
5. Piloto com ótica real concluído e correções aplicadas (F8-12/13).
6. Versão versionada + monitoramento ativo (F8-17/18).

## Fontes

- `docs/project-management/KANBAN.md` (fases 5 e 8) · `ROADMAP.md` (marcos) · `DECISIONS.md` (P1/P3/P6).
- Auditoria: `docs/DEVELOPMENT_AUDIT_A_H.md` (fase A — sync/feature flags; bloqueios P0).
