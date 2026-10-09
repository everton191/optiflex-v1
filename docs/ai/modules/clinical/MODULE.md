# Clinical

## Purpose

Abrir atendimentos da fila, editar prontuário e registrar anamnese, exame, solicitações, prescrição, anexos e finalização.

## Directory

Páginas em `src/app/pages.tsx`; domínio em `clinical.ts` e `clinical-service.ts`; persistência no repository clínico; codec de arquivos em `src/infrastructure/storage/attachment-codec.ts`.

## Routes

- `/clinico`
- `/clinico/atendimento/:attendanceId`

## Main Pages

`ClinicalQueuePage`, `ClinicalWorkspacePage`.

## Components

`Button`, textarea nativo, `.clinical-form`, `.form-actions`, listas.

## Services

`ClinicalService.load`, `save`, `finalize`, `history`, `storeAttachment`, `readAttachmentContent`, `dropAttachmentContent`. Upload/exclusão passam pelo `ClinicalDraft.attach`/`detach` (autosave com a mesma fila de escrita do texto).

## Repositories

`ClinicalRepository` / `LocalClinicalRepository`.

## Stores / Hooks

Sem store/hook. O rascunho fica em `useState` até salvar.

## Models

`ClinicalRecord`, `ClinicalAttachment` (metadados + `category` opcional: EXAM/IMAGE/DOCUMENT), `ClinicalAttachmentContent` (conteúdo em base64). Validação em `clinical.ts`: `ATTACHMENT_ALLOWED_MIME_TYPES` (PDF/JPG/PNG), `ATTACHMENT_MAX_BYTES` (5 MB), `assertValidAttachment`/`assertValidAttachmentCategory`.

## Permissions

`clinical.workspace.access` em lista, workspace e menu.

## Dependencies

Attendance fornece `attendanceId`; storage usa `clinicalRecords` e a tabela `attachments` (conteúdo por id).

## Public API

`ClinicalService` e `ClinicalRepository`.

## Shared Components

Button, AppShell, feedback e classes de formulário.

## Files Normally Modified

- Formulário: `ClinicalWorkspacePage`.
- Finalização: `clinical-service.ts`.
- Modelo: `clinical.ts`.
- Persistência: `LocalClinicalRepository` + schema se mudar.
- Anexos: `ClinicalWorkspacePage` (upload/lista/prévia), `clinical-draft.ts`, `attachment-codec.ts`.

## Avoid Modifying

Não criar módulos fictícios separados para prescription/exams: hoje são campos do ClinicalRecord. Não armazenar arquivo binário como metadado: os metadados ficam em `ClinicalAttachment` e o conteúdo real (base64) na tabela `attachments`.

## Common Tasks

### Alterar prescrição

→ ClinicalWorkspacePage + ClinicalRecord + regra de finalize.

### Alterar regras de anexo (tipo/tamanho/categoria)

→ `clinical.ts` (`ATTACHMENT_*`/`assertValidAttachment`) + `clinical-attachments.test.ts`.

### Alterar formulário

→ ClinicalWorkspacePage + `.clinical-form`.

### Alterar persistência

→ ClinicalRepository/LocalClinicalRepository/schema.

### Alterar fila clínica

→ ClinicalQueuePage + AttendanceRepository.

## Related Modules

Attendance; futuramente sales/work-orders se consumirem prescrição.
