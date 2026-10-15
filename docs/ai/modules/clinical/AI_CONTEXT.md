# AI CONTEXT — Clinical

## Current Status

- Fila clínica por loja e prontuário editável.
- Rascunho salvo somente por ação explícita.
- Finalização bloqueada sem prescrição.
- Anexos mostram contagem de metadados.
- Refração estruturada por olho (F3-07, `c2f0c27`): seção "Refração (OD/OE)" na workspace, prescrições append-only na tabela `prescriptions` (Dexie v13), autora = `session.userName`, listagem com marcação da ativa (`activePrescription`); backup `schema: 13`.
- Uso, retificação e handoff de venda (F3-06, `6f2fe74`): `Prescription.usage` opcional (DISTANCE/NEAR/CONTINUOUS/MULTIFOCAL), "Retificar" na prescrição ativa (pré-preenche graus, exige motivo, versão original preservada com autor/data/motivo), snapshot imutável em `Sale.prescription` na criação do orçamento no caixa, `SalesService.listCustomerPrescriptions` com `LocalPrescriptionRepository`, backup valida FK de `sales.prescription`.

## Current Decisions

- Chave do registro é `attendanceId`.
- Prescrição, exame e solicitações pertencem ao mesmo registro.
- Prescrição estruturada (`Prescription`) é documento próprio append-only, independente do texto do prontuário: pode ser emitida mesmo após a finalização; correções vêm por retificação (`retifyPrescription` no domínio e via `ClinicalService`, com motivo obrigatório).
- Permissão interna independe do cargo exibido pela empresa.

## Known Problems

- Não há autosave.
- Attachment não possui conteúdo de arquivo.
- Finalizar ClinicalRecord não atualiza Attendance para `FINISHED`.
- Fila não mostra nome do cliente na ClinicalQueuePage.

## Pending Work

- Ciclo completo de status.
- Testes clínicos.

## Important Files Right Now

- `src/app/ClinicalWorkspace.tsx` (`ClinicalQueuePage` em `src/app/ReceptionWorkspace.tsx`, F1-03).
- `src/domain/clinical-service.ts`.
- `src/domain/clinical.ts`.
- `LocalClinicalRepository`, `LocalPrescriptionRepository` e tabelas `clinicalRecords`/`prescriptions`.

## Recent Structural Changes

- F3-07 (`c2f0c27`): `LocalPrescriptionRepository`, `ClinicalService.issuePrescription`/`listPrescriptions`, Dexie v13 (`prescriptions`), seção OD/OE na workspace, backup schema 13, testes de eixo/persistência/isolamento (276/276).
- F3-06 (`6f2fe74`): `PrescriptionUsage` + labels, `ClinicalService.retifyPrescription`, `SalePrescription`/`salePrescriptionSnapshot` + validação em `buildQuote`/`updateQuote`, `PrescriptionRepository.listByCustomer`, validação/FK de `sales.prescription` no backup, UI de uso/retificação na clínica e seletor de prescrição no caixa (305/305).
- Interface foi compactada e labels técnicos removidos.

## Be Careful With

- Dados clínicos exigirão segurança adicional antes de uso real.
- Mudança de modelo pode exigir migração Dexie.

## Next Likely Task

F3-05 receitas ópticas (#44) — dependências F3-06 e F3-07 liberadas.
