# User Flows

Fluxos de ponta a ponta usados pela equipe e por testes manuais. Cada fluxo referencia os cards e commits que o entregaram.

## Agenda e recepção (F3-01, `679951f`)

1. Recepção abre **Agenda** no menu (`/agenda`, permissão `attendance.read`).
2. Escolhe **Dia** ou **Semana**, navega com "Dia/Semana anterior", "Próximo" e "Hoje".
3. Clica em **Novo evento** (`attendance.create`), seleciona cliente, tipo (consulta, retorno, entrega, ajuste, cobrança), data/hora, profissional opcional e observações, e confirma em **Agendar**.
4. O evento aparece no dia correto da agenda e persiste após reload (IndexedDB).
5. Em um evento do tipo consulta, retorno ou ajuste, clica em **Virar atendimento**: o cliente já cadastrado é reutilizado sem redigitação, o atendimento entra na fila como `WAITING` e a tela vai para `/atendimentos?customer=<id>`.
6. **Cancela** marca o evento como cancelado; eventos concluídos/cancelados não viram atendimento de novo.

## Cadastro e edição de cliente (F2-06, `00d0d9e`)

1. **Clientes** → busca por nome, CPF ou telefone.
2. **Novo cliente** (`customers.manage`): nome, telefone e CPF; após salvar, navega para a fila com pré-seleção (quando permitido) ou para o perfil.
3. No perfil, **Editar cadastro** (`/clientes/:customerId/editar`): ajusta nome, telefone, CPF, e-mail e nascimento; o `id`/`createdAt` originais são preservados e as alterações sobrevivem a reload.

## Pagamentos parciais e estornos (F4-12 `60e2ca4`, F4-18 `9f0fdfc`)

1. **Caixa** → aba Vendas: informa forma de pagamento e pode receber um valor parcial (saldo pendente exibido por venda).
2. Vendas pagas totalmente ou parcialmente ficam `PAID`/`PARTIAL`; recebimento excede o saldo é bloqueado.
3. Cancelar uma venda paga exige motivo e registra estorno `REFUND` no caixa quando o caixa está aberto; estoque é devolvido atomicamente.

## Receita óptica: emissão, retificação e impressão (F3-06 `6f2fe74`, F3-05 `0e8675a`)

1. Profissional clínico abre a consulta (`/clinico/atendimento/:attendanceId`, permissão `clinical.workspace.access`) e registra OD/OE com esfera, cilindro, eixo e adição na seção "Refração (OD/OE)".
2. Escolhe o tipo de uso (longe, perto, contínuo ou multifocal) e emite a prescrição: a versão 1 fica ativa e a lista mostra autor, data, graus e uso.
3. Para corrigir um grau, clica em **Retificar** na prescrição ativa: os campos são pré-preenchidos, o motivo é obrigatório e a versão original permanece no histórico (autor, data e motivo preservados).
4. Em qualquer linha da lista, clica em **Imprimir**: a rota `/prescricoes/:prescriptionId` abre a receita óptica com paciente, profissional, tipo de uso, OD/OE, observações e o número da versão sempre visível (inclusive em reimpressões).
5. Clica em **Imprimir** na página da receita: o diálogo de impressão do navegador abre com a barra lateral/topo ocultos (`@media print`).
6. No caixa, ao criar um orçamento, o vendedor seleciona uma prescrição do cliente: o snapshot (versão, uso e graus) entra na venda sem redigitação.

## Cadastro inicial assistido (F2-18 `b7f3e0a`; progresso retomável F7-15, `b7b7aeb`)

1. Usuário com permissão `settings.manage` abre **Assistente inicial** no menu Administração (`/admin/assistente`); o progresso mostra as 5 etapas numeradas (Organização, Loja, Usuário, Produtos, Revisão) com "opcional" nas puláveis.
2. **Organização**: nome da organização e cargo exibido na área clínica são obrigatórios; razão social e CNPJ são opcionais (formatado ao digitar). "Salvar e continuar" normaliza e grava os settings imediatamente.
3. **Loja**: informa o nome da primeira loja — criada via serviço de administração e usada no passo de produtos; pode ser pulada (lojas existentes continuam disponíveis).
4. **Usuário**: cria um OWNER (nome, e-mail e senha) ligado à loja criada ou a todas as ativas; pode ser pulado. A senha nunca entra no progresso salvo do assistente.
5. **Produtos iniciais**: adiciona um ou mais itens (nome, código opcional, categoria, saldo inicial, estoque mínimo e preço opcional) direto no catálogo da loja; "Concluir produtos" ou "Pular esta etapa".
6. **Revisão**: mostra organização, loja, usuário, produtos, etapas puladas e a situação de cada etapa (concluída/pulada/em andamento); "Concluir e ir para o dashboard" limpa o progresso salvo e leva à home.
7. **Sair e continuar depois** (nas etapas Organização, Loja, Usuário e Produtos) grava o progresso atual e volta ao dashboard. Reabrir **Assistente inicial** exibe o aviso "Retomamos o assistente na etapa …", restaura os campos já preenchidos (inclusive rascunho não salvo, como o nome da loja em digitação) e retoma de onde parou.
8. O stepper numerado permite revisitar etapas concluídas clicando nelas; **Recomeçar do zero** limpa apenas o progresso do assistente — os registros já gravados (settings, loja, usuário, produtos) permanecem, e o assistente pode ser refeito a qualquer momento.

## Ajuda contextual (F7-16, `9674594`)

1. Ao lado dos títulos e campos das telas críticas aparece um botão **"?"** (`HelpTip`): o clique abre uma bolha curta com a dica (`role="note"`) e o segundo clique fecha. A dica **nunca bloqueia a operação** — o botão é pequeno, a bolha tem `pointer-events: none` (cliques atravessam), clicar em qualquer outro lugar fecha e Escape também fecha; não há modal nem foco preso.
2. **Caixa → aba Sessão**: dica "Saldo esperado" (suprimento entra, sangria e estorno saem; no fechamento o valor contado é comparado com o esperado e a diferença fica registrada).
3. **Caixa → aba Recebimentos**: dica "Recebimentos parciais" (dá para receber parte do valor várias vezes até quitar; cada baixa vira movimento de caixa e o troco aparece no recebimento em dinheiro).
4. **Ordens de serviço → cabeçalho**: dica "Fluxo da OS" (a ordem nasce da venda, passa por laboratório/produção e conferência, fica pronta, o cliente é avisado e é entregue; cancelar exige motivo).
5. **Ordens de serviço → detalhe, Progresso da fabricação**: dica "Etapas e histórico" (cada etapa grava quem fez e quando; voltar de etapa preserva o histórico).
6. **Estoque → formulário, Dados fiscais**: dica sobre NCM (8 dígitos), CFOP (ex.: 5102 = venda) e CEST (substituição tributária) — opcional hoje, entra na NF-e da Fase 6.
7. **Configurações → Regime tributário**: dica sobre o regime da empresa (Simples Nacional, Lucro Presumido etc.); as regras fiscais da Fase 6 vão usá-lo.
8. Em impressões (`@media print`) os botões "?" são ocultos; os textos ficam em sentence case mesmo dentro do legend em caixa alta. Os textos vivem no próprio componente de cada tela para mudarem junto com a funcionalidade (risco de texto desatualizado) e estão listados aqui como referência única de revisão.

## Importação de produtos por CSV (F2-16, `db1ade9`)

1. Usuário com permissão de gerenciar estoque abre **Estoque** e clica em **Importar CSV** no cabeçalho da seção de produtos; escolhe um arquivo `.csv` (exemplo pronto: [`IMPORT_EXAMPLE.csv`](./IMPORT_EXAMPLE.csv)).
2. Colunas obrigatórias: **nome**, **código**, **categoria** (rótulo "Armação"/"Lente"/"Acesso" ou código FRAME/LENS/ACCESSORY). Opcionais: **quantidade**, **estoque mínimo**, **preço**, **custo**, **marca**, **material**, **descrição** — cabeçalhos no plural/singular, com ou sem acento, em pt-BR ou inglês são reconhecidos (ex.: `nome`/`product`, `código`/`sku`, `preço`/`price`).
3. **Arquivo inválido é rejeitado com motivo** antes de qualquer prévia: vazio, sem cabeçalho, colunas obrigatórias ausentes (lista quais), sem linhas de dados ou aspas não fechadas.
4. A **prévia** abre em diálogo com as contagens (prontas, existentes, duplicadas, com erro) e cada linha com seu status: `READY`, `ERROR` (motivo por célula — nome vazio, código/quantidade/categoria/preço inválidos, saldo acima do disponível), `DUPLICATE_IN_FILE` (mesmo código repetido no arquivo) ou `EXISTS` (código já cadastrado na loja). As 30 primeiras linhas são exibidas.
5. Marcar **Atualizar produtos já existentes pelo código (cadastro e preços; o saldo atual não é alterado)** faz as linhas `EXISTS` atualizarem o cadastro e os preços pelo código — **o saldo nunca é alterado** pela importação, e células em branco preservam o valor cadastrado.
6. Confirmar aplica tudo em **uma transação única**: se algo falhar no meio, nada é gravado (rollback) e o erro aparece. No sucesso, a tela informa quantos produtos foram **criados, atualizados e ignorados**, e cada item criado recebe um movimento "Importação de planilha" com o saldo inicial. Linhas com erro ou duplicadas são simplesmente puladas (corrige o CSV e importa de novo).

