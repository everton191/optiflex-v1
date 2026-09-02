# AI CONTEXT — Clinical

## Current Status

- Fila clínica por loja e prontuário editável.
- Rascunho salvo somente por ação explícita.
- Finalização bloqueada sem prescrição.
- Anexos mostram contagem de metadados.

## Current Decisions

- Chave do registro é `attendanceId`.
- Prescrição, exame e solicitações pertencem ao mesmo registro.
- Permissão interna independe do cargo exibido pela empresa.

## Known Problems

- Não há autosave.
- Attachment não possui conteúdo de arquivo.
- Finalizar ClinicalRecord não atualiza Attendance para `FINISHED`.
- Fila não mostra nome do cliente na ClinicalQueuePage.

## Pending Work

- Ciclo completo de status.
- Armazenamento real de anexos.
- Formulários estruturados para refração/prescrição.
- Testes clínicos.

## Important Files Right Now

- `src/app/pages.tsx` (`ClinicalQueuePage`, `ClinicalWorkspacePage`).
- `src/domain/clinical-service.ts`.
- `src/domain/clinical.ts`.
- `LocalClinicalRepository` e tabela `clinicalRecords`.

## Recent Structural Changes

- Interface foi compactada e labels técnicos removidos.

## Be Careful With

- Dados clínicos exigirão segurança adicional antes de uso real.
- Mudança de modelo pode exigir migração Dexie.

## Next Likely Task

Estruturar prescrição/exame e sincronizar finalização com Attendance.
