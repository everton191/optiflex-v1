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

## Cadastro inicial assistido (F2-18, `b7f3e0a`)

1. Usuário com permissão `settings.manage` abre **Assistente inicial** no menu Administração (`/admin/assistente`); o progresso mostra as 5 etapas (Organização, Loja, Usuário, Produtos, Revisão) com "opcional" nas puláveis.
2. **Organização**: nome da organização e cargo exibido na área clínica são obrigatórios; razão social e CNPJ são opcionais (formatado ao digitar). "Salvar e continuar" normaliza e grava os settings imediatamente.
3. **Loja**: informa o nome da primeira loja — criada via serviço de administração e usada no passo de produtos; pode ser pulada (lojas existentes continuam disponíveis).
4. **Usuário**: cria um OWNER (nome, e-mail e senha) ligado à loja criada ou a todas as ativas; pode ser pulado.
5. **Produtos iniciais**: adiciona um ou mais itens (nome, código opcional, categoria, saldo inicial, estoque mínimo e preço opcional) direto no catálogo da loja; "Concluir produtos" ou "Pular esta etapa".
6. **Revisão**: mostra organização, loja, usuário, produtos e etapas puladas; "Concluir e ir para o dashboard" leva à home. Cada etapa salva ao avançar — fechar o navegador no meio não perde o que já foi gravado; o assistente pode ser refeito a qualquer momento.
