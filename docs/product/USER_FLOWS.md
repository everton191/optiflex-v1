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
