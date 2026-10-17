# SECURITY PLAN — plano de segurança

**Status:** login local + escopo por registro entregues (F7-02, F1-11); auditoria F8-07 publicada em 08/10/2026 (nenhum P0 novo; lacuna P0 restante: F1-12 tratamento global de erros); F1-10 auditoria de alterações entregue em `2a58572` (trilha local imutável + página de consulta).
Cartões: F1-12, F8-08 + F5-02/04/05/11/18 (bloqueados com a Fase 5).

Atualizado em: 08/10/2026 · Base do código: `feat/operational-flow-v2` até `2a58572`.

## Ativos a proteger

1. Dado clínico (prontuário, anexos, prescrições) — sensível por excelência.
2. Dado financeiro (vendas, caixa, parcelas).
3. Integridade operacional (estoque, caixa — operação duplicada = prejuízo direto).
4. Credenciais futuras (certificado fiscal A1, chaves de API — F6-10/F6-18).

## Threat model (curto)

| Ameaça | Controle atual | Estado |
|---|---|---|
| Login indevido no dispositivo | Senha local com hash+salt (`password.ts`), validação de força, mensagem genérica "E-mail ou senha inválidos" (anti-enumeração) | Coberto |
| Sessão expirada ou de usuário inativo | TTL de 12h (`isSessionExpired`), bloqueio de inativos (`sessionUserState` → `/bloqueado`), sync de role sem reload | Coberto |
| Força bruta no login | Nenhum rate-limit/backoff por tentativa | **P2 aberto (S-01)** |
| Vazamento do backup | AES-GCM 256 + PBKDF2 600k iterações (Web Crypto), senha mínima 12, ação restrita a OWNER, confirmação literal "RESTAURAR", validação de integridade antes de tocar nos dados, rollback transacional | Coberto |
| Escopo de loja/registro contornado | `access-context` (SELF/STORE/ORG/NETWORK) + `assertStoreAccess`/`assertRecordAccess` nos repositories; matriz rota×perfil automatizada (F8-06) | Coberto |
| Erro inesperado derruba a UI (tela branca) | Sem ErrorBoundary/global handler | **P0 aberto (F1-12/#20)** |
| Alteração sem rastro (auditoria) | Log de auditoria global ENTREGUE (F1-10/#18, `2a58572`): cancelamento de venda, ajuste de estoque e cadastros administrativos; evolução para nuvem = F5-18 | **P1 fechado (F1-10)** |
| Backend ausente (autorização só no frontend) | Arquitetura local-first single-user; aceito como risco do modelo | **P3 aceito (S-03)** |
| Sessão roubada via filesystem | Sessão é marcador local `current` no IndexedDB, sem token de rede | **P3 aceito (S-04)** |
| Dispositivo perdido com dados clínicos | IndexedDB sem criptografia própria (depende do SO/usuário do device); mitigado por TTL e backup criptografado | **P2 aberto (S-02)** |
| XSS via conteúdo clínico/anexos | React escapa por padrão; sem `dangerouslySetInnerHTML` no código | Coberto |
| Segredos comitados no repositório | Varredura automatizada (`src/domain/security-scan.test.ts`) em todo o `src/` | Coberto |
| PWA cacheando dados sensíveis | Service worker precacha apenas assets do build; dados vivem no IndexedDB | Coberto |

## Varredura de segredos (F8-07)

- **Automatizada:** `src/domain/security-scan.test.ts` varre `src/**/*.{ts,tsx}` por padrões de chaves privadas, AKIA (AWS), `sk_live_` (Stripe), `ghp_`/`github_pat_` (GitHub), Slack, GitLab, Google (`AIza`) e URLs com credenciais PostgreSQL/MySQL. Roda em todo `npm.cmd test`.
- **Resultado em 08/10/2026:** 0 achados (217/217 verdes sobre `277fdde`).
- **Manual complementar:** busca por literais `api_key`/`secret`/`token` hardcoded — apenas fixtures fictícias em testes (`Senha-ficticia-teste-123`).

## Testes negativos existentes

| Área | Arquivo | Cobertura |
|---|---|---|
| Autenticação | `src/domain/authentication-service.test.ts` | e-mail/senha errados, inativo, troca com senha atual errada ou nova curta, demo bloqueado |
| Sessão | `src/domain/access.test.ts` | expiração por TTL, sem `issuedAt` ou data inválida |
| Escopo | `src/domain/access-scope.test.ts`, `src/infrastructure/storage/access-scope.test.ts` | loja/registro negados por perfil STORE; enforcement nas escritas e listagens dos repositories |
| Rotas/ação | `src/domain/permission-routes.test.ts` | matriz rota×perfil para os 10 perfis; negativos de vendedor/clínico/caixa |
| Backup | `src/infrastructure/storage/backup.test.ts` | senha errada, ciphertext adulterado, snapshot inválido/duplicado, rollback transacional |
| Segredos | `src/domain/security-scan.test.ts` | padrões de credenciais no código-fonte |

## Achados (relatório F8-07)

| ID | Severidade | Achado | Status |
|---|---|---|---|
| S-00 | **P0** | Sem tratamento global de erros (tela branca/dado silencioso) | Aberto — card F1-12/#20 (BACKLOG, p1) |
| S-01 | P2 | Sem rate-limit/backoff de tentativas de login no dispositivo | Aberto — aceitável no piloto local; monitorar uso |
| S-02 | P2 | IndexedDB sem criptografia própria; depende do SO/usuário do device | Aberto — risco aceito no modelo offline-first; mitigado por TTL 12h e backup criptografado |
| S-03 | P3 | Autorização aplicada apenas no frontend (sem backend) | Aceito — arquitetura local-first single-user |
| S-04 | P3 | Sessão é marcador local sem binding de dispositivo | Aceito |
| S-05 | P3 | Sem auto-lock por inatividade (somente TTL de 12h) | Aberto — melhoria futura |

Nenhum P0 de exposição direta de dados (segredos, backup, escopo) — os controles de login/escopo/backup/segredos estão cobertos e testados. O único P0 é de resiliência de UI (F1-12).

## Estado atual verificado (08/10/2026)

| Controle | Estado | Evidência/card |
|---|---|---|
| Matriz de 10 perfis + guards de rota (`Can`, `RequirePermission`) | OK + testes — mapa único rota→permissão (`route-guards.ts`) | F8-06 (`94b9d50`; `permission-routes.test.ts`, 7 casos) |
| Escopo por registro (SELF/STORE/ORG/NETWORK) | OK + testes — filtro e guard em repositories, seletor de loja restrito | F1-11 (`a2c1369`; `access-scope.test.ts`, 12 casos) |
| Identidade/sessão (login, sair, expiração) | OK + testes — hash local, TTL 12 h, demo explícita | F7-02 (`bae739b`; `authentication-service.test.ts`, `access.test.ts`) |
| Integridade transacional (venda/estoque/caixa/OS) | OK + testes | `sale-stock.test.ts`, `cash*.test.ts`, `work-orders.test.ts` |
| Idempotência de recebimento | OK | `cash-service.test.ts` |
| Backup/restauração local | OK + testes — anexos incluídos no schema 12 (F3-09) | `backup.test.ts` |
| Log de auditoria (autor/data/ação/motivo) | ENTREGUE (F1-10, `2a58572`) — `AuditEntry` imutável (ação, registro, autor, loja, data, motivo/resumo) para cancelamentos, ajustes de estoque e cadastros administrativos; página `/admin/auditoria` com filtros (guard `settings.manage`); validado no backup (schema 14); nuvem = F5-18 | F1-10 (#18) |
| Tratamento global de erros | AUSENTE (risco de tela branca/dado silencioso) | F1-12 (#20) |
| Segredos/credenciais | OK + varredura automatizada — 0 achados | F8-07 (`277fdde`; `security-scan.test.ts`) |
| Isolamento multiempresa | N/A (single-tenant local) | `MULTITENANCY.md` |
| LGPD | NÃO VERIFICADO (jurídico externo) | F8-08 bloqueado |

## Prioridades (ordem de ataque)

1. **P0:** F1-12 erros globais (última lacuna P0; desbloqueia F7-11).
2. **P0:** preservar atomicidade já construída (nenhuma alteração em `confirm`/`applyStockMovement` sem teste de concorrência).
3. **P1:** F8-08 LGPD (jurídico) → F6-18 cofre de segredos. (F1-10 concluída em `2a58572`.)
4. **P1/Fase 5:** autenticação real, policies server-side, storage de anexos, logs por tenant.

## Escopo por registro — F1-11 entregue (08/10/2026)

- **Contexto de acesso:** a sessão ativa vira `AccessContext` (`buildAccessContext` em `src/domain/access-context.ts`) com escopo da role e lojas permitidas do usuário; `AppProviders` monta/desmonta o contexto global junto com sessão/usuários/loja atual.
- **Regras:** `NETWORK`/`ORGANIZATION` (OWNER, NETWORK_ADMINISTRATOR, AUDITOR, FINANCE) acessam qualquer loja; `STORE` (demais perfis) só as lojas de `user.storeIds`; `SELF` (pronto, sem role atual) só registros do próprio usuário; registros sem `storeId` (clientes, configurações) seguem compartilhados.
- **Enforcement nos repositories:** `assertStoreAccess` nas listagens por loja, `assertRecordAccess` nas escritas (atendimento, venda+confirm, OS, estoque/movimentos, caixa, prontuário) e filtro por loja no histórico do cliente (`listByCustomer`). Sem contexto ativo (testes/backup) não há restrição.
- **Loja atual:** seletor do topo filtrado por loja acessível, `selectStore` valida antes de trocar e o carregamento migra para a primeira loja acessível quando a persistada não é permitida.
- **OWNER automático:** encerrado no F7-02 (`SessionRepository.get()` → `null`); sem sessão não existe contexto de acesso.

## Identidade e sessão — F7-02 entregue (08/10/2026)

- **Rotas:** `/login` (pública), `/bloqueado` (pública), `/trocar-senha` (autenticada). `RequireSession` envolve todo o app: sem sessão → `/login`; usuário inativo → `/bloqueado`.
- **Senha local:** SHA-256 com salt por usuário (`src/domain/password.ts`), mínimo de 8 caracteres, guardada apenas em `User.passwordHash/passwordSalt` (IndexedDB). Falha de login responde sempre "E-mail ou senha inválidos." (anti-enumeração).
- **Sessão:** `LocalSession.issuedAt` + TTL de 12 h (`SESSION_TTL_HOURS`). Sessão expirada é limpa no carregamento e leva a `/login?motivo=expirada`; `Sair` limpa a sessão persistida.
- **Modo demonstração:** entrada explícita em `/login`, marcada com `demo: true` e selo "Demonstração" no AppShell; não substitui senha cadastrada.
- **Sem OWNER automático:** `SessionRepository.get()` retorna `null` sem registro persistente (fim do `defaultSession`).
- **Recuperação:** senha esquecida → administrador redefinida em Usuários → Editar → nova senha; primeira senha via `/trocar-senha` quando o usuário ainda não tem credencial.
- **Futuro:** F5-02 (auth na nuvem) deve manter a mesma interface (`AuthenticationService`/`SessionRepository`).

## Regras permanentes

- Nunca expor anamnese a perfil não clínico (regra de fronteira em `MODULE_BOUNDARIES.md`).
- Nunca logar/imprimir segredo, senha ou certificado.
- Guard do frontend nunca é a única barreira quando houver backend.
- Varredura de segredos antes de cada release (`RELEASE_CHECKLIST.md` item 0) — automatizada via `security-scan.test.ts`.
- Dados demo claramente separados de operação real.

## Próximos passos

1. F1-12 erros globais (S-00, único P0 aberto).
2. Rate-limit de login (S-01) quando houver decisão de UX de bloqueio temporário.
3. Revarrer a varredura de segredos antes do piloto (já automatizada no `npm.cmd test`).
4. Pentest externo pago: fora do escopo atual; planejar antes da fase SaaS (F5).

## Fontes

- `docs/ai/06_PERMISSION_MAP.md` (matriz real de permissões).
- `docs/DEVELOPMENT_AUDIT_A_H.md` (bloqueios P0 de acesso/prontuário/recuperação).
- `docs/project-management/KANBAN.md` (cards P0) · `DECISIONS.md` (P8 demo).
