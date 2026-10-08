# OptiCore — auditoria do desenvolvimento A–H

Data: 04/09/2026. Repositório: `everton191/optiflex-v1`, branch `v1`.

## Conclusão

**Nenhuma das oito fases está integralmente concluída.** A–G possuem implementações parciais; H não possui módulos operacionais. Há uma base local navegável, não uma V1 pronta para operação clínica/comercial real. Uma página, enum, botão ou tabela existente não comprova um fluxo completo.

Fonte de requisitos: documento fornecido pelo usuário, **OPTICORE V1 — ESPECIFICAÇÃO CANÔNICA DO FRONTEND**, seções 0–137; fases definidas em 112–119, aceite em 125–128. O original foi lido do anexo `1d6d0da4-2cfa-457b-a901-f54c83c73cb8/pasted-text.txt`. As seções citadas abaixo permitem rastrear cada grupo de requisitos.

Decisões posteriores do usuário prevalecem sobre o mockup e exemplos originais:

- Manter `CLINICAL_PROFESSIONAL`; cargo visível configurável pela empresa, sem permissão vinculada ao nome da profissão.
- Manter a paleta existente; mockup é referência de organização, não autorização para trocar cores.
- Desktop e mobile compactos; tablet escolhe apresentação conforme orientação.
- Vendas, recebimentos e abertura permanecem agrupados no **Caixa**, com abas e permissões. Não recriar menus redundantes.
- Organizar primeiro fundação → componentes → shell → rotas → permissões → armazenamento → PWA; evoluir os fluxos depois.
- Melhorias propostas neste relatório são backlog, não funcionalidades já implementadas.

Legenda: **Parcial** = existe parte implementada, mas faltam requisitos/validação. **Ausente** = não localizado no código atual. **Base existente** = peça implementada, ainda sujeita ao aceite integrado. Não atribuir percentuais sem pesos e testes definidos.

## Evidências e alcance

Inspeção de `src/app/router.tsx`, `pages.tsx`, `providers.tsx`, `permissions.tsx`, `src/shell/AppShell.tsx`, componentes/tokens, configuração PWA, modelos/services/contracts do domínio, schema/repositories locais e mapas dos dez módulos existentes. Inventário de `src` e `public` confirma que os módulos não listados ainda não possuem implementação própria.

Nesta rodada foram corrigidos o boot por índices ausentes, o fallback indevido de administrador, a seleção cliente → atendimento, estados assíncronos da recepção e proteções de criação na UI. A migração 9 preserva registros. Foram executados 12 testes automatizados e build de produção. Verificação de navegador usa dados fictícios em sessão isolada; não certifica todas as fases nem substitui testes físicos de recuperação.

Evidências desta rodada:

- Antes da correção, teste reproduziu `SchemaError: KeyPath name on object store stores is not indexed`.
- Depois: 12/12 testes passando, incluindo criação/validação de cliente, vínculo e persistência por loja e migração v8 → v9 com registros em todas as tabelas; build/PWA concluídos.
- Navegador: clientes carregam, cadastro navega com cliente selecionado, envio limpa a seleção/query, atendimento permanece após reload e não aparece na fila da outra loja.
- Link com cliente inexistente deixa a criação desabilitada; sessão sintética de recepção não abre `/caixa` (Acesso não permitido).
- Desktop e captura mobile 390×844 inspecionados; largura de conteúdo mobile = 390, sem transbordamento horizontal nessa tela. Sem erros de página reportados no fluxo normal verificado.
- Ainda requer testes: falha de armazenamento e retry na UI, gravações concorrentes, todos os perfis/escopos, tablet nas duas orientações, instalação/reabertura offline em aparelhos reais e todos os cinco fluxos completos. Não declarar esses itens aprovados.

## Bloqueios prioritários antes de uso real

| Prioridade | Evidência atual | Correção necessária |
|---|---|---|
| P0 — acesso | `LocalSessionRepository` retorna OWNER local quando não há sessão; não há login; escopos não são aplicados aos registros | Autenticação/bloqueio local, usuário identificável, loja autorizada e acesso por ação/registro; manter demo isolada |
| P0 — prontuário | `ClinicalService.save` aceita registro finalizado; `load` cria rascunho para qualquer ID sem conferir atendimento/loja | Validar vínculo e escopo; finalizar imutavelmente; retificar criando versão com autor/data/motivo |
| P0 — perda clínica | Rascunho clínico só grava pelo botão; anexos são apenas metadados | Autosave recuperável, fila de gravação e conteúdo real de arquivos com testes de falha/reabertura |
| P0 — conclusão | `finalize` grava `finalizedAt`, mas não altera `Attendance.status` | Transação entre documento finalizado, atendimento FINISHED e eventos; remover da fila de espera |
| P0 — cobrança | Cada `CashService.receive` cria novo UUID; prevenção visual usa Set temporário | Pagamento durável/idempotente, saldo pendente, transação e proteção contra reload/duplo clique/duas abas |
| P0 — recuperação | Não há backup/restauração; dados existem só naquele navegador | Backup completo incluindo anexos, validação, prévia e restauração segura com rollback |
| P1 — consistência | Estoque salva saldo e movimento separadamente; OS busca antes de inserir sem índice único; abertura de caixa também busca antes de gravar | Operações atômicas, unicidade e testes concorrentes; não chamar isso de idempotência comprovada |
| P1 — valores | Services comercial/caixa/estoque comparam `<= 0`, mas não validam finitude; abertura não valida saldo no service | Regras monetárias/quantidades no domínio, rejeitar NaN/Infinity, precisão de centavos e arredondamento |
| P1 — loja | Caixa/clínica/estoque usam efeitos sem descarte uniforme de resultados antigos; seletor lista todas as lojas | Aplicar escopo e evitar exibir/usar dados da loja anterior durante trocas; tratar erro da troca |
| P1 — painel | Dashboard mostra valores comerciais estáticos para todos os perfis | Métricas reais por perfil; dados demo claramente identificados; nada comercial no painel clínico |

## Fase A — Fundação (parcial)

Referências: 1–9, 66–73, 80–93, 110–112, 120–124, 134–136.

| Item obrigatório | Estado atual | Falta para concluir |
|---|---|---|
| Design System | Button/Input/Card e tokens | Variantes/tamanhos, Select, Badge, Tabs, Table, Drawer, Dialog, Toast, Tooltip, Search, EmptyState, Skeleton; estados acessíveis |
| Layouts e componentes de domínio | AppShell e classes globais | PageHeader/PageContainer, CustomerHeader, AttendanceHeader, PrescriptionSummary, SaleSummary, StoreContext reutilizáveis |
| Navegação responsiva | Shell desktop/mobile com CSS por orientação | Menu móvel enxuto com acesso a todas as áreas autorizadas em “Mais”; administração hoje some no mobile; teclado, foco e toque |
| Router | Rotas básicas e redirects | Subrotas/abas inventariadas abaixo, página desconhecida, recuperação de erro, links diretos e retorno preservando contexto |
| Permission Engine | Matriz de dez perfis e guards | Ações granulares, escopos SELF/STORE/ORGANIZATION/NETWORK efetivos e testes completos |
| Feature flags | Ausente | Flags cloud, ARPA, WhatsApp, laboratórios, e-commerce, IA inicialmente desligadas; distinguir cadastro local de laboratório da integração externa |
| Repository Layer | Contratos e adapters Dexie | Contratos dos módulos ausentes; composição central futura; transações entre entidades |
| IndexedDB | Schema v9; índices do boot corrigidos | Migrações dos novos modelos; testes com dados representativos, falta de espaço, falha de escrita e atualização da PWA |
| PWA/offline | Manifest, registro SW, precache | Aceite offline em instalação/reabertura, versão/cache, indicador Online/Offline e estado Local; armazenamento real de anexos |
| Mock data | Duas lojas e dois usuários; métricas estáticas | Modo demo explícito/separado com 20 clientes, profissionais, vendedores, 50 produtos, receitas, vendas, OS, parcelas e estoque coerentes |
| Sync preparado | Ausente | Interface SyncEngine desativada, outbox/eventos UUID, status e externalReferences; não ativar cloud agora |
| Segurança/recuperação | Base de permissões | Backup/restauração, log de alterações, bloqueio, sessão; ver B e H |
| Formulários e feedback | Estado local, validações pontuais | Schemas compartilhados; loading/empty/success/error/offline/denied consistentes em todas as páginas; confirmação para ações relevantes |
| Busca global | Ausente | Ctrl+K para registros/ações permitidas, sem expor dados de outro perfil |

Stack original é recomendação: não instalar Tailwind/Radix/Zustand/React Hook Form/Zod apenas para marcar checklist. Registrar a alternativa equivalente e comprovar os comportamentos obrigatórios.

Aceite A: componentes globais usados em páginas reais; navegação/URL direta/refresh funcionando; dados preservados offline e em migração; perfis sem vazamento; demo isolada; erros recuperáveis.

## Fase B — Usuários e contexto (parcial)

Referências: 52–65, 74–79, 85–87, 104, 113.

| Tela/guia | Estado atual | Falta |
|---|---|---|
| Login / sessão / sair | Ausente | Identidade local verificável; credenciais protegidas; encerrar sessão; não entrar como OWNER automaticamente fora da demo |
| Bloqueio / PIN / troca de senha | Ausente | Desbloqueio, timeout configurável, redefinição segura e proteção de dados locais |
| Selecionar loja | Seletor na topbar persiste | Restringir por usuário/escopo, tratar falha, impedir mistura entre lojas, tela de seleção/contexto inválido |
| Lojas | Apenas seed | Cadastro/edição/inativação e regras de acesso; visão “Todas” somente para consultas autorizadas |
| Usuários | Lista somente | Cadastro/edição/inativação, vínculo com lojas, função e escopo |
| Perfis / permissões | Lista estática | Administração autorizada, matriz por ação e registro, auditoria das mudanças |
| Configurações | Nome da empresa/cargo clínico | Identificação para documentos, preferências, bloqueio, backup, catálogos e demais ajustes previstos |
| Cargo clínico configurável | Campo salvo, chave técnica correta | Aplicar label configurado onde pertinente; shell/perfis ainda usam label fixo da matriz |
| Integrações / importação | Ausente | Telas desativadas honestas, adapters, CSV com mapear/prévia/duplicidades; ARPA só preparada, não ativada |

Aceite B: testar todos os perfis entrando por URL direta, tentando ação indevida e trocando loja; usuário inativo sem acesso; sessão expirada bloqueada; sem contexto OWNER criado em falha.

## Fase C — Cliente e recepção (parcial)

Referências: 10–13, 47–51, 102–104, 114.

| Tela/guia | Estado atual | Falta |
|---|---|---|
| Clientes / busca | Nome/CPF/telefone | Código interno, pesquisa normalizada de documento/telefone, paginação/volume, último atendimento e dados mascarados conforme uso |
| Cadastro rápido | Nome, CPF, telefone; nome validado | Telefone obrigatório conforme plano, nascimento, e-mail, sexo quando aplicável; validar/avisar duplicidade sem bloqueio indiscriminado |
| Editar/complementar cadastro | Ausente | Formulário reutilizado, histórico de alterações, arquivamento não destrutivo; mesclagem administrativa preparada para etapa posterior |
| Perfil / Resumo | Nome, contato e lista de atendimentos | Última consulta/prescrição/óculos/compra, saldo autorizado, próximo retorno; ações Nova venda/Novo atendimento por perfil |
| Perfil / Clínico e Prescrições | Ausente | Histórico clínico autorizado e versões de documentos; não mostrar anamnese ao vendedor |
| Perfil / Óculos | Ausente | Pares anteriores, armação/lente/tratamento/medidas e vínculo com prescrição/venda/OS |
| Perfil / Compras | Ausente | Orçamentos e vendas com detalhes/status/reabertura |
| Perfil / Financeiro | Ausente | Parcelas, pagamentos e saldo por permissão |
| Perfil / Garantias | Ausente | Chamados, reparos e vínculo com produto/OS |
| Perfil / Documentos | Ausente | Arquivos reais, categorias, prévia/download e acesso por classificação |
| Perfil / Histórico | Só atendimentos com data/status | Timeline integrada: atendimento, receita, exame, orçamento, venda, pagamento, OS, entrega, garantia e ajuste |
| Agenda Hoje/Dia/Semana | Ausente | Consulta, retorno, entrega, ajuste, cobrança e outro; filtros por loja/profissional e vínculo com fila |
| Novo atendimento | Seleção + consulta fixa; pré-seleção corrigida | Tipo, profissional, notas, prioridade, confirmação do cliente; rotas próprias/detalhe |
| Fila da recepção | WAITING por loja | Agendado/chegou/em atendimento/finalizado/faltou/cancelado, transições, tempos, prioridade e responsável |

Aceite C: cadastrar cliente, recarregar, localizar, pré-selecionar, enviar uma vez à loja correta, chamar/concluir/cancelar com histórico; não perder dados ao retornar; nenhuma guia aponta para tela genérica fingindo estar pronta.

## Fase D — Clínico (parcial e prioritária)

Referências: 14–32, 46, 76–79, 105, 115.

| Guia/tela | Estado atual | Falta |
|---|---|---|
| Minha fila | Fila da loja com ID abreviado | Filtro por profissional, nome/idade/tipo/espera/prioridade; ação Atender alterando status; pesquisa clínica |
| Workspace / Resumo | Formulário único | Header fixo com cliente/idade/atendimento/data/profissional; Histórico; navegação por guias e contexto validado |
| Anamnese | Textarea | Queixa, sintomas configuráveis, início/frequência/intensidade, uso de óculos/lentes, antecedentes/medicações/alergias; informação anterior com origem/data |
| Exame / refração | Textarea | OD/OE separados: esférico, cilíndrico, eixo, adição, prisma, base, DNP; DP total/longe/perto, altura; acuidade/pressão/observações configuráveis |
| Prescrição | Texto dentro do prontuário | Documento próprio derivado do atendimento, campos estruturados, tipo de uso, observações, versão imutável e retificação |
| Solicitações | Textarea | Catálogo configurável, nome personalizado, justificativa, prioridade, data sugerida, acompanhamento e documentos próprios |
| Anexos | Contagem de metadados | Upload PDF/JPG/PNG, câmera, conteúdo durável, categoria e vínculo; prévia/download; validação tamanho/tipo e exclusão confirmada/auditada |
| Autosave | Ausente | Salvo/Salvando/Erro, retry, recuperação do rascunho, ordenação de gravações e proteção contra troca de registro |
| Finalizar | Exige texto na prescrição | Revisão de pendências/anamnese/solicitações; confirmação; documento imutável + fila concluída atomicamente |
| Conclusão | Ausente | Comprar agora, gerar orçamento, imprimir/enviar receita e encerrar sem compra; permissões e sem redigitação |
| Prescrições / Exames independentes | Ausentes | Listas, detalhe, versões, solicitações e acesso por documento |
| Impressão/PDF | Ausente | PrintLayout separado, identificação e dados do documento; impressão legível, download e compartilhamento local; canais online ficam futuros |

Aceite D: profissional realiza consulta inteira, recupera rascunho após fechar/reabrir, mantém anexos, finaliza uma vez, imprime sem comprar, encontra tudo no histórico; retificação preserva original; recepção/vendedor não veem conteúdo clínico indevido. Campos e regras clínicas devem ser homologados pelo responsável da operação; nenhum diagnóstico ou preenchimento decisório automático.

## Fase E — Comercial (parcial)

Referências: 30–46, 106–108, 116.

| Guia/etapa no Caixa | Estado atual | Falta |
|---|---|---|
| Cliente / prescrição | Cliente selecionável | Receber customerId/attendanceId/prescriptionId; somente dados ópticos necessários, sem anamnese |
| Armação | Ausente | Catálogo com código/marca/modelo/cor/tamanho/material/preço/disponibilidade/loja e filtros |
| Lentes | Ausente | Fabricante/linha/material/índice/tipo e preço registrado na venda |
| Tratamentos | Ausente | Seleção configurável e precificação; preparar compatibilidade sem decisão clínica automática |
| Medidas | Ausente | DNP e altura OD/OE, DP, importação dos valores permitidos e revisão antes de OS |
| Orçamento | Descrição + total, QUOTE | Itens e seleção persistidos, rascunho/enviado/aguardando/aceito/recusado/expirado, recuperar/editar/imprimir |
| Venda | Confirma QUOTE | Resumo completo, autor, data, cancelamento auditado, preço praticado e integração com estoque/OS |
| Descontos / aprovação | Ausente | Limites por permissão, solicitação ao gerente e histórico de aprovação |
| Pagamento | Recebimento de total no Caixa | Dinheiro/PIX/débito/crédito/carnê/misto, valores divididos, saldo, arredondamento, troco quando aplicável, estorno controlado |

Aceite E: consulta alimenta venda sem redigitação; abandonar preserva orçamento; recuperar dias depois conserva itens/preços/receita; dividir pagamento sem saldo inconsistente; cancelar mantém rastreabilidade. Não criar menu duplicado de Vendas/Pagamentos.

## Fase F — Operacional (parcial)

Referências: 34–39, 44–45, 57, 62, 109, 117.

| Guia/tela | Estado atual | Falta |
|---|---|---|
| OS lista/detalhe | Botão cria OPEN; sem tela | OS automática no fluxo definido, cliente/receita/itens/medidas/loja/vendedor, prazo e histórico; unicidade transacional por venda |
| Produção / entrega | Só enums básicos | Aguardando produção → enviado laboratório → produção → retornado → conferência → pronto → avisado → entregue; cancelamento controlado |
| Produtos / catálogo | Ausente | Cadastro, categorias, códigos, armações/lentes/tratamentos, preços/tabelas e histórico |
| Estoque por loja | Lista vazia sem cadastro UI | Entrada/saída/inventário/ajuste, mínimo, reservas/baixa de venda e consistência de saldo |
| Movimentações | Tabela/service, sem tela | Histórico com motivo/autor/loja, transação com saldo e acesso autorizado |
| Transferências | Ausente | Solicitação/aprovação/separação/trânsito/recebimento sem duplicar ou perder estoque |
| Laboratórios | Ausente | Cadastro e acompanhamento local de OS; integração externa separada por flag |

Aceite F: venda gera uma única OS, produção progride até entrega, estoque e movimentos conferem; transferência entre duas lojas altera os saldos uma única vez e mantém histórico; dois operadores não duplicam OS/baixa.

## Fase G — Financeiro (parcial)

Referências: 42–43, 56, 58, 62, 118.

| Guia/tela | Estado atual | Falta |
|---|---|---|
| Caixa / abertura | Persiste sessão e saldo inicial | Validação no domínio, uma sessão ativa por loja/operação, responsável e concorrência |
| Caixa / sessão e movimentos | Sem extrato | Total por método, recebimentos, sangria, suprimento, justificativa, autor e vínculo |
| Caixa / fechamento | Ausente | Conferência contado/esperado/diferença, confirmação, relatório e bloqueio de novos lançamentos |
| Recebimentos | Entrada por venda | Idempotência durável, venda paga/parcial, histórico, cancelamento/estorno e saldo |
| Parcelas / carnê | Ausentes | Entrada, número, valores, vencimento inicial, periodicidade, prévia, emissão/impressão e baixa parcial/total |
| Contas a receber | Ausente | Vencidas/a vencer/pagas, filtros, saldo, recebimento e vínculo com cliente |
| Contas a pagar | Ausente | Cadastro, vencimento, baixa e histórico por loja |
| Conciliação / inadimplência | Ausente | Consultas e consistência entre recebimentos, contas, venda e caixa |

Aceite G: venda com pagamento misto/carnê, receber parcela uma vez mesmo após reload, saldo correto, caixa separado por loja, sangria/suprimento e fechamento reconciliados. Regras de juros/multas/prazos precisam de definição do negócio antes de implementação.

## Fase H — Pós-venda e gestão (ausente)

Referências: 77–79, 96–101, 119.

| Guia/tela | Falta |
|---|---|
| Garantias | Cadastro ligado a cliente/venda/armação/lente/OS; aberta/análise/aprovada/negada/reparo/finalizada |
| Reparos / ajustes | Plaqueta/haste/limpeza/parafuso/outro; responsável, datas, observações e histórico |
| Relatórios | Visões de vendas/clientes/estoque/financeiro com dados reais, filtros por loja/período, impressão e permissões |
| Dashboard por função | Minha fila/retornos para clínico; vendas/orçamentos/OS para vendedor; sessão/parcelas para caixa; gestão para gerente |
| Metas / comissões | Constam no menu canônico; sem implementação. Definir cálculo, competência e permissão antes de construir |
| Auditoria | Quem/quando/o quê/registro/loja/dispositivo; versões e cancelamentos; consulta sem alteração |
| Tarefas | Criar/atribuir/concluir tarefas ligadas a cliente/OS/retorno/cobrança e prazo |
| Notificações | Central de OS pronta, parcela vencida, estoque mínimo, cliente aguardando, transferência e retorno; acesso por perfil |

Aceite H: garantia/reparo aparece no histórico, tarefas e avisos levam ao registro correto; relatórios conciliam com domínio; auditoria preserva autor/motivo/versões e não mostra dados indevidos.

## Inventário completo de rotas e guias

Uma guia pode ser aba dentro de um workspace. Não precisa virar item do menu principal, mas precisa ser localizável, funcional, permitida e ter URL/estado de navegação definido. Rotas abaixo vêm da seção 9 e complementos do plano; não presumir implementadas por retornarem HTML do Vite.

| Grupo | Rotas do plano | Situação / destino |
|---|---|---|
| Acesso | `/login`, `/bloqueado`, `/selecionar-loja`, `/trocar-senha` | Ausentes; seletor de loja só no shell |
| Início | `/`, `/dashboard` | `/` existe com números estáticos; alias `/dashboard` ausente |
| Clientes | `/clientes`, `/clientes/novo`, `/clientes/:customerId` | Existem parcialmente |
| Edição | `/clientes/:customerId/editar` | Ausente |
| Perfil / Resumo | `/clientes/:id/resumo` | Ausente como guia/rota; perfil básico não substitui resumo integrado |
| Perfil / Prescrições | `/clientes/:id/prescricoes` | Ausente; incluir conteúdo Clínico autorizado, citado também na seção 47 |
| Perfil / Óculos | `/clientes/:id/oculos` | Ausente |
| Perfil / Compras | `/clientes/:id/compras` | Ausente |
| Perfil / Financeiro | `/clientes/:id/financeiro` | Ausente |
| Perfil / Garantias | `/clientes/:id/garantias` | Ausente; manter apesar de omitida na lista abreviada da seção 47 |
| Perfil / Documentos | `/clientes/:id/documentos` | Ausente |
| Perfil / Histórico | `/clientes/:id/historico` | Ausente; há apenas lista de atendimentos no perfil |
| Atendimento | `/atendimentos` | Existe, somente fila WAITING/criação simples |
| Atendimento novo/detalhe/fila | `/atendimentos/novo`, `/atendimentos/:attendanceId`, `/atendimentos/fila` | Ausentes; não confundir com formulário dentro da lista |
| Clínica | `/clinico`, `/clinico/atendimento/:attendanceId` | Existem parcialmente |
| Minha fila | `/clinico/fila` | Ausente como rota; `/clinico` hoje mostra fila da loja |
| Workspace clínico | `/clinico/atendimento/:id/resumo`, `/anamnese`, `/exame`, `/prescricao`, `/solicitacoes`, `/anexos`, `/finalizar` | Todos os sufixos pertencem a `/clinico/atendimento/:id`; nenhuma subrota/guia está implementada |
| Prescrições | `/prescricoes`, `/prescricoes/:prescriptionId`, `/prescricoes/:prescriptionId/imprimir` | Ausentes |
| Exames | `/exames`, `/exames/solicitacoes`, `/exames/:examId` | Ausentes |
| Comercial | `/vendas`, `/vendas/nova`, `/vendas/:saleId` | `/vendas` redireciona para Caixa; nova/detalhe ausentes. Implementar como etapas/abas do Caixa com compatibilidade, sem duplicar lógica |
| Venda após atendimento | `/vendas/nova?customer=:id&attendance=:id` | Ausente; manter vínculo com prescrição também, na área unificada |
| OS | `/ordens-servico`, `/ordens-servico/:id` | Ausentes |
| Estoque | `/estoque` | Existe só listagem |
| Estoque detalhe/movimentos | `/estoque/produto/:id`, `/estoque/movimentacoes` | Ausentes |
| Transferências | `/estoque/transferencias`, `/estoque/transferencias/nova` | Ausentes |
| Financeiro | `/financeiro`, `/financeiro/receber`, `/financeiro/carne`, `/financeiro/carne/:id`, `/financeiro/pagar` | Ausentes; recebimento pode ser apresentado no Caixa, mantendo guias de contas/carnês e links compatíveis |
| Caixa | `/caixa` | Existe com abas Vendas/Recebimentos/Abertura |
| Caixa subrotas | `/caixa/abrir`, `/caixa/sessao/:id`, `/caixa/fechar` | Ausentes; abertura disponível apenas como aba |
| Compatibilidade atual | `/pagamentos` | Redirect adicional para Caixa, não equivale a pagamento dividido |
| Agenda | `/agenda`, `/agenda/dia`, `/agenda/semana` | Ausentes |
| Relatórios | `/relatorios`, `/relatorios/vendas`, `/relatorios/clientes`, `/relatorios/estoque`, `/relatorios/financeiro` | Ausentes |
| Administração | `/admin/usuarios`, `/admin/perfis`, `/admin/configuracoes` | Existem parcialmente |
| Administração restante | `/admin/lojas`, `/admin/permissoes`, `/admin/integracoes`, `/admin/auditoria`, `/admin/importacao` | Ausentes |
| ARPA | `/integracoes/arpa` | Ausente; planejar feature desativada sem executar integração |
| Pós-venda | `/garantias`, `/reparos` | Ausentes |
| Avisos | `/notificacoes` | Ausente |
| Sem URL definida no original | Produtos/catálogo, laboratórios, metas, comissões, tarefas, backup/restauração, mesclagem, busca global | Ausentes; definir endereço/guia sem inventar que já há rota canônica |
| Erros | `/sem-acesso` existe; `*` não | Adicionar página desconhecida/erro recuperável sem mascarar ausência de funcionalidade |

### Organização sugerida do menu, preservando a simplificação

- Início; Clientes; Atendimento (fila/agenda); Clínico; Caixa; Operação (OS/produtos/estoque/laboratórios); Gestão (contas/relatórios/pós-venda/tarefas); Administração.
- Dentro do **Caixa**: Vendas, Recebimentos, Sessão (abrir/movimentar/fechar); carnês e contas acessíveis por contexto sem duplicar recebimento.
- Mobile: poucos atalhos por função + **Mais**, que dá acesso a todas as guias autorizadas. Não copiar todas as áreas para a barra inferior.
- Clínico: menu sem valores de venda, custos e comissões; recepção sem anamnese; vendedor com prescrição/medidas necessárias, não prontuário completo.
- Tablet mantém a decisão por orientação. Títulos de tela usam termos usuais; chaves técnicas permanecem só no código/documentação.

## Melhorias sugeridas — além de completar o obrigatório

Não confundir autosave, refração estruturada, anexos, histórico, versões e impressão com “extras”: **já são requisitos do plano**.

### Profissional clínico

1. Comparação lado a lado entre prescrição atual e anterior, com data, autor e unidade; sem interpretar automaticamente evolução ou recomendar tratamento.
2. Modelos de preenchimento configurados pelo responsável, sempre revisáveis; nunca copiar resposta antiga como achado atual sem confirmação e identificação da origem.
3. Visão compacta de pendências documentais/exames solicitados/resultados recebidos, com responsáveis e datas, sem alertas diagnósticos automáticos.
4. Navegação por teclado no desktop e campos OD/OE claros no tablet; rascunho com indicador visível e recuperação orientada quando uma gravação falha.
5. Registro explícito da revisão do documento, autor e motivo da retificação; exportação apenas do documento autorizado, sem anexar o prontuário inteiro por padrão.

### Atendimento / recepção

1. Confirmação visual de identidade antes de enviar à fila e aviso de atendimento já aberto para o mesmo cliente, permitindo casos legítimos com motivo.
2. Exibir espera, responsável e próximo passo em uma linha; filtros simples por tipo/profissional/estado. Prioridade informada conforme regra da operação, não triagem clínica automática.
3. Converter agendamento em chegada sem redigitar; retorno com vínculo ao atendimento anterior e opção de reagendar.
4. Resumo administrativo separado de observações clínicas; observação da recepção com origem e data.
5. Após cada ação mostrar destino claro: entrou na fila, está em atendimento, concluiu, quer orçamento ou saiu só com receita.

### Histórico do cliente

1. Linha do tempo filtrável por período, tipo, loja e profissional, com resumo e link para o registro original; aplicar autorização antes de montar resultados/contagens.
2. Agrupar consulta → prescrição → orçamento → venda → OS → entrega, mantendo também eventos de pagamento, retorno, garantia e ajuste.
3. Documentos com versão, origem interna/externa, data e autor; preservar cancelados/retificados com status legível, sem exclusão silenciosa.
4. Resumo “último registro + pendências + próximo retorno”, abrindo detalhes só quando solicitado; evita um perfil longo e sobrecarregado.
5. Mostrar alertas de duplicidade e preparar mesclagem administrativa com prévia, autorização e trilha de auditoria; não mesclar automaticamente.

## Ordem segura de conclusão

1. **Fechar A/B essenciais:** componentes globais que serão reutilizados, rotas/estados, sessão/escopo, eventos, backup/restauração e demo separada. Corrigir transações e validações de gravação.
2. **Concluir C:** cadastro completo, perfil com estrutura de guias autorizadas, agenda, recepção e transições da fila. Não exibir guias como prontas quando seus dados dependem de fases posteriores.
3. **Concluir D:** modelos estruturados, cabeçalho/abas, autosave, anexos, imutabilidade, finalização, impressão e histórico clínico. Homologação do responsável.
4. **Concluir E:** catálogo selecionável, receita/medidas, orçamento recuperável e venda, pagamentos contratados com G.
5. **Concluir F/G integradas:** OS e estoque consistentes, pagamentos/parcelas/carnê/contas, sessão e fechamento; nenhuma duplicação em concorrência.
6. **Concluir H e dependências tardias do perfil:** garantias/reparos, relatórios, tarefas, notificações e timeline completa. Auditoria nasce na base, não só no último passo.
7. **Aceite final:** testar todos os itens abaixo, resolver falhas e registrar evidência por requisito. Não liberar com base somente no build.

## Checklist final de aceite (seções 125–128)

- [ ] Fluxo 1 completo: cadastrar → atender → prescrever → imprimir → finalizar sem compra.
- [ ] Fluxo 2 completo: cliente existente → consulta → prescrição → armação/lentes/medidas → pagamento → OS.
- [ ] Fluxo 3 completo: atendimento → orçamento → sair → reabrir em outro momento → concluir conservando seleção/preços.
- [ ] Fluxo 4 completo: venda → carnê → parcela → recebimento → saldo/financeiro/caixa corretos.
- [ ] Fluxo 5 completo: desconectar → reiniciar aplicação → criar registros/anexos → recarregar → dados intactos.
- [ ] Cada guia do inventário abre por navegação e URL direta; refresh/back preservam contexto; ausência/erro não vira tela branca.
- [ ] Profissional prescreve; anexos e histórico permanecem; receita alimenta venda sem redigitação.
- [ ] Cliente pode sair apenas com receita; impressão/PDF de receita, orçamento, venda, OS, carnê e relatório funcionam.
- [ ] Pagamentos divididos, parcelas, troco/regras monetárias e estornos conciliam; repetição/reload/concorrência não cobram duas vezes.
- [ ] Caixa, vendas, OS e estoque separados por loja; cliente compartilhável conforme escopo autorizado.
- [ ] Todos os perfis validados em rota, ação e registro: recepção sem financeiro; vendedor sem anamnese; clínico sem fechamento de caixa.
- [ ] Formulários e menus usáveis em desktop, celular e tablet retrato/paisagem; todas as áreas autorizadas acessíveis no mobile.
- [ ] Fechar navegador durante consulta, reiniciar e recuperar rascunho; sem sobrescrever versão finalizada.
- [ ] Backup com dados/anexos, restauração validada, rejeição de arquivo inválido e recuperação de falha testados.
- [ ] Auditoria local, autor/loja/dispositivo/motivo, retificação e cancelamento não destrutivo.
- [ ] Migração de base anterior, atualização/cache PWA, falta de espaço e gravação negada com feedback verificadas.
- [ ] Dados demo não confundidos com operação real; nenhuma integração/IA ativada como dependência da V1.

## Arquivos que orientarão as próximas etapas

- Rotas/guias: `src/app/router.tsx`; telas atuais: `src/app/pages.tsx` (extrair por módulo incrementalmente quando necessário, não reescrever tudo).
- Sessão/contexto: `src/app/providers.tsx`, `src/domain/access.ts`, `administration-service.ts`.
- Clientes/fila: `src/domain/customer.ts`, `reception-service.ts`.
- Clínica: `src/domain/clinical.ts`, `clinical-service.ts`.
- Comercial/OS/caixa/estoque: respectivos modelos/services de `src/domain/`.
- Contratos/transações/migrações: `src/domain/repositories.ts`, `src/infrastructure/storage/`.
- Componentes/layout: `src/design-system/`, `src/shell/AppShell.tsx`, `src/styles.css`.
- Contexto por módulo: `docs/ai/modules/*/MODULE.md` e `AI_CONTEXT.md`.

Este relatório é inventário e plano de conclusão. Não implementa automaticamente fases novas, não certifica conformidade clínica/legal e não autoriza publicação de dados reais ou integrações externas.
