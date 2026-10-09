# RELEASE CHECKLIST — checklist de aceite por versão

Base: checklist final da `docs/DEVELOPMENT_AUDIT_A_H.md` (seções 125–128) + regras de execução deste repositório.
Nenhuma versão é liberada com apenas "build verde".

## 0. Pré-condições de qualquer release

- [ ] Branch e escopo revisados (`git log` da release, `git status` limpo).
- [ ] Toda feature ligada a Issue com `status/done` e evidência de teste no card.
- [ ] `npm.cmd test` → 100% verde (números atuais: 158/158 em `6ce9c9a`).
- [ ] `npm.cmd run build` → exit 0.
- [ ] `npx.cmd tsc -b --pretty false` → exit 0.
- [ ] Login/sessão intactos (`/login`, `Sair`, expiração de 12 h) após mudanças em `access`/`providers`/`router`.
- [ ] Escopo por registro intacto (seletor de loja, `assertStoreAccess`/`assertRecordAccess`) após mudanças em `access-context`/`local-repositories`.
- [ ] Sem segredos/credenciais no repositório (varredura).
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

- [ ] Backup com dados/anexos; restauração validada; arquivo inválido rejeitado.
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
