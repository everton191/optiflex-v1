# RELEASE CHECKLIST — checklist de aceite por versão

Base: checklist final da `docs/DEVELOPMENT_AUDIT_A_H.md` (seções 125–128) + regras de execução deste repositório.
Nenhuma versão é liberada com apenas "build verde".

## Convenção de versionamento e tags (F8-17, entregue em `v0.1.0`)

- **Formato:** tags anotadas semânticas `vMAJOR.MINOR.PATCH` (semver).
  - `MAJOR`: incompatibilidades de dados/migração ou mudança de contrato público do app.
  - `MINOR`: funcionalidades novas compatíveis com dados existentes.
  - `PATCH`: correções e ajustes sem mudança de comportamento esperado.
- **Faixa 0.x:** enquanto as Fases 5 (SaaS) e 6 (NF-e) estiverem bloqueadas e não houver piloto/lançamento, o `MAJOR` fica em `0` — `1.0.0` é reservado para o primeiro lançamento com Fase 8 completa (e2e, piloto, LGPD).
- **Origem da tag:** apenas commits de `feat/operational-flow-v2` com `npx.cmd tsc -b` exit 0, `npm.cmd test` 100% verde e `npm.cmd run build` exit 0 — **validações executadas imediatamente antes de criar a tag** (risco do card: "tag apontando para commit quebrado").
- **Mensagem da tag:** anotada (`git tag -a vX.Y.Z -m ...`), citando o escopo incluído, os números de validação e o caminho do changelog correspondente.
- **Changelog correspondente:** entrada em `CHANGELOG_DEVELOPMENT.md` (branch `docs/master-kanban`) cujo SHA de commit corresponde ao commit da tag; a tag pode viver na branch de código enquanto o changelog vive na branch de docs — o elo é o SHA citado nos dois lados.
- **Imutabilidade:** tag publicada nunca é movida ou apagada (`git tag -d` local só para erro antes do push); defeitos corrigem-se para frente com tag nova.
- **Publicação explícita:** sem automação — `git push origin vX.Y.Z` após revisão humana (fora do escopo do card: publicação automática).
- **Lista de tags:** `git tag` (local) ou `git ls-remote --tags origin`.

## 0. Pré-condições de qualquer release

- [ ] Branch e escopo revisados (`git log` da release, `git status` limpo).
- [ ] Toda feature ligada a Issue com `status/done` e evidência de teste no card.
- [ ] `npm.cmd test` → 100% verde (números atuais: 346/346 em `2a58572`).
- [ ] `npm.cmd run build` → exit 0.
- [ ] `npx.cmd tsc -b --pretty false` → exit 0.
- [ ] Login/sessão intactos (`/login`, `Sair`, expiração de 12 h) após mudanças em `access`/`providers`/`router`.
- [ ] Escopo por registro intacto (seletor de loja, `assertStoreAccess`/`assertRecordAccess`) após mudanças em `access-context`/`local-repositories`.
- [ ] Sem segredos/credenciais no repositório (varredura automatizada: `security-scan.test.ts`, F8-07).
- [ ] `PROJECT_STATUS.md` e `CHANGELOG_DEVELOPMENT.md` atualizados.
- [ ] `docs/ai` (módulos afetados) atualizados; mudanças cosméticas dispensam mapas globais.

## 1. Fluxo 1 — cadastro → atender → prescrever → imprimir → finalizar sem compra

- [ ] Cadastrar cliente, recarregar, localizar.
- [ ] Enviar à fila correta; chamar/concluir/cancelar com histórico.
- [ ] Prescrição estruturada preenchida; anexos preservados.
- [ ] Imprimir receita sem gerar venda.
- [ ] Finalizar uma única vez; rascunho recuperável após fechar/reabrir.

## 2. Fluxo 2 — cliente existente → consulta → prescrição → armação/lentes/medidas → pagamento → OS

- [ ] Receita alimenta a venda sem redigitação.
- [ ] Medidas chegam à OS.
- [ ] Pagamento baixa estoque em transação única.
- [ ] Uma única OS criada (mesmo com dois operadores).
- [ ] Cancelamento de venda paga devolve estoque, registra `REFUND` no caixa e reduz o saldo esperado.

## 3. Fluxo 3 — atendimento → orçamento → sair → reabrir → concluir

- [ ] Orçamento conserva itens/preços/seleção após dias e reload.

## 4. Fluxo 4 — venda → carnê → parcela → recebimento → saldo/financeiro/caixa corretos

- [ ] Parcela baixada uma vez mesmo após reload/duplo clique.
- [ ] Fechamento de caixa concilia com recebimentos e parcelas.

## 5. Fluxo 5 — desconectar → reiniciar → criar registros/anexos → recarregar → dados intactos

- [ ] Offline real (aparelho), instalação PWA, reabertura.
- [ ] Anexos duráveis com conteúdo.

## 6. Permissões (todos os perfis)

- [ ] Recepção sem financeiro; vendedor sem anamnese; clínico sem fechamento de caixa.
- [ ] URL direta negada vira `/sem-acesso` (não tela branca).
- [ ] Escopo por loja: nenhum dado cruzado.

## 7. Dados e recuperação

- [ ] Backup com dados/anexos/prescrições; prévia com confirmação; arquivo inválido rejeitado com motivo; falha no meio da importação não corrompe a base (rollback em transação única).
- [ ] Migração de schema testada com registros; PWA atualizada sem perda.
- [ ] Auditoria local: autor/loja/dispositivo/motivo; cancelamento não destrutivo.

## 8. UI/UX e dispositivos

- [ ] Desktop 1440, mobile 390×844, tablet retrato/paisagem.
- [ ] Todas as áreas autorizadas acessíveis no mobile.
- [ ] Estados loading/empty/error/denied/offline consistentes; sem tela branca.
- [ ] Impressão/PDF de receita, orçamento, venda, OS, carnê e relatório.

## 9. Fiscal (quando F6 existir)

- [ ] Homologação aprovada (NF-e/NFC-e); rejeição tratada; XML arquivado.
- [ ] Ambiente de produção visível e confirmado.

## 10. Publicação

- [ ] `CHANGELOG_DEVELOPMENT.md` com a lista de mudanças.
- [ ] Tag semântica criada **após** testes verdes.
- [ ] `PROJECT_STATUS.md` atualizado com commit/tag da release.
- [ ] Monitoramento pós-release (quando F5-17 existir).

## Releases publicadas

| Tag | Data | Commit | Validações | Changelog correspondente |
|---|---|---|---|---|
| `v0.1.0` | 08/10/2026 | `2a58572` (`feat/operational-flow-v2`) | tsc 0 · 346/346 · build 0 (executadas antes da tag) | `CHANGELOG_DEVELOPMENT.md` — entrada `2a58572` e anteriores (F1-10, F2-01, F3-19, F3-16, F3-11, F3-08 e levas anteriores de 08/10/2026) |
