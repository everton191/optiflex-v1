# AI CONTEXT — Clinical

## Current Status

- Fila clínica por loja e prontuário editável.
- Rascunho salvo somente por ação explícita.
- Finalização bloqueada sem prescrição.
- Anexos mostram contagem de metadados.
- Refração estruturada por olho (F3-07, `c2f0c27`): seção "Refração (OD/OE)" na workspace, prescrições append-only na tabela `prescriptions` (Dexie v13), autora = `session.userName`, listagem com marcação da ativa (`activePrescription`); backup `schema: 13`.

## Current Decisions

- Chave do registro é `attendanceId`.
- Prescrição, exame e solicitações pertencem ao mesmo registro.
- Prescrição estruturada (`Prescription`) é documento próprio append-only, independente do texto do prontuário: pode ser emitida mesmo após a finalização; correções vêm por retificação (UI de retificação fica para F3-06).
- Permissão interna independe do cargo exibido pela empresa.

## Known Problems

- Não há autosave.
- Attachment não possui conteúdo de arquivo.
- Finalizar ClinicalRecord não atualiza Attendance para `FINISHED`.
- Fila não mostra nome do cliente na ClinicalQueuePage.

## Pending Work

- Ciclo completo de status.
- UI de retificação de prescrição (domínio pronto; entra com F3-06).
- Testes clínicos.

## Important Files Right Now

- `src/app/ClinicalWorkspace.tsx` (`ClinicalQueuePage` segue em `pages.tsx`).
- `src/domain/clinical-service.ts`.
- `src/domain/clinical.ts`.
- `LocalClinicalRepository`, `LocalPrescriptionRepository` e tabelas `clinicalRecords`/`prescriptions`.

## Recent Structural Changes

- F3-07 (`c2f0c27`): `LocalPrescriptionRepository`, `ClinicalService.issuePrescription`/`listPrescriptions`, Dexie v13 (`prescriptions`), seção OD/OE na workspace, backup schema 13, testes de eixo/persistência/isolamento (276/276).
- Interface foi compactada e labels técnicos removidos.

## Be Careful With

- Dados clínicos exigirão segurança adicional antes de uso real.
- Mudança de modelo pode exigir migração Dexie.

## Next Likely Task

F3-06 prescrição estruturada (#45) — dependências F1-07 e F3-07 liberadas; UI de retificação entra aqui.
