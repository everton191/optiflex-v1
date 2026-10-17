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

### 5.1 Procedimento offline em aparelho real (F8-04)

Evidência automatizada entregue (`f5b8e0b`): `src/infrastructure/storage/offline-persistence.test.ts` — sessão inteira (cliente, atendimento, prescrição, orçamento com desconto, confirmação com baixa de estoque, recebimento no caixa e OS) sobrevive a `database.close()` + `database.open()` com backup `validateBackup` íntegro (363/363). **Isso não substitui a execução em aparelho** (fora de escopo: simular offline só no DevTools e chamar de aprovado).

Passos para o aparelho real (celular ou desktop com Chrome/Edge; instalação exige HTTPS ou localhost):

1. Publicar/ servir o `dist/` do build por HTTPS (ex.: `npm run build` + host estático com TLS) e abrir a URL.
2. Instalar a PWA ("Instalar aplicativo" no menu do navegador) e abrir pelo ícone.
3. Fazer login (perfil OWNER ou conforme o teste) e selecionar a loja.
4. **Ligar o modo avião** (offline real) e aguardar 10 s.
5. Sem rede, criar os dados sintéticos: cliente "Offline Teste <data>", atendimento, prescrição com graus, item de estoque (se necessário), orçamento com 1 linha de R$ 300 e desconto de 5%, confirmar a venda, abrir o caixa com R$ 0 e receber os R$ 285 em dinheiro, criar a OS.
6. **Fechar o app por completo** (force stop / fechar abas) ainda offline.
7. Reabrir pelo ícone **ainda offline** e conferir, um a um: cliente na listagem, venda confirmada com total R$ 285 e desconto "Aplicado por…", estoque do produto com saldo menor em 1, recebimento de R$ 285 nos movimentos do caixa, OS vinculada, prescrição no perfil/guia clínico.
8. Sair do modo avião e recarregar: nada deve quebrar nem duplicar.
9. (Opcional, OWNER) Exportar backup offline e conferir que o arquivo é válido.

Registrar a evidência na tabela abaixo (uma linha por dispositivo); só então marcar o card como DONE:

| Dispositivo | SO | Navegador/Versão | Data | Resultado | Observações |
|---|---|---|---|---|---|
| (pendente) | | | | | aguardando execução manual |

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
