# Clinical

## Purpose

Abrir atendimentos da fila, editar prontuário e registrar anamnese, exame, solicitações, prescrição, anexos e finalização.

## Directory

Páginas em `src/app/pages.tsx` e `src/app/ClinicalWorkspace.tsx`; domínio em `clinical.ts` e `clinical-service.ts`; persistência no repository clínico e no `LocalPrescriptionRepository`; codec de arquivos em `src/infrastructure/storage/attachment-codec.ts`.

## Routes

- `/clinico`
- `/clinico/atendimento/:attendanceId`

## Main Pages

`ClinicalQueuePage`, `ClinicalWorkspacePage`.

## Components

`Button`, textarea nativo, `.clinical-form`, `.form-actions`, listas.

## Services

`ClinicalService.load`, `save`, `finalize`, `history`, `storeAttachment`, `readAttachmentContent`, `dropAttachmentContent`, `listPrescriptions`, `issuePrescription` (monta o input com `attendanceId`/`storeId` do contexto, autora com `session.userName` e grava via `PrescriptionRepository` — F3-07), `retifyPrescription` (autoriza pela loja do atendimento, valida motivo e grava a próxima versão com `retifies`/`retificationReason` — F3-06). Upload/exclusão passam pelo `ClinicalDraft.attach`/`detach` (autosave com a mesma fila de escrita do texto).

## Repositories

`ClinicalRepository` / `LocalClinicalRepository`; `PrescriptionRepository` / `LocalPrescriptionRepository` (`listByAttendance` com guarda de loja no atendimento, `listByCustomer` para o caixa, `save` append-only — F3-07/F3-06).

## Stores / Hooks

Sem store/hook. O rascunho fica em `useState` até salvar.

## Models

`ClinicalRecord`, `ClinicalAttachment` (metadados + `category` opcional: EXAM/IMAGE/DOCUMENT), `ClinicalAttachmentContent` (conteúdo em base64). Validação em `clinical.ts`: `ATTACHMENT_ALLOWED_MIME_TYPES` (PDF/JPG/PNG), `ATTACHMENT_MAX_BYTES` (5 MB), `assertValidAttachment`/`assertValidAttachmentCategory`.

`Prescription` + `PrescriptionEye` (F1-07, `41f0bfd`): documento append-only de versões (`version`, `author`, `issuedAt`, OD/OE com `sphere`/`cylinder`/`axis`/`add`, `notes`, `usage` opcional DISTANCE/NEAR/CONTINUOUS/MULTIFOCAL). Retificação: `retifyPrescription(current, input, reason, author)` cria a próxima versão com `retifies`/`retificationReason` sem reescrever o original; `activePrescription(list)` resolve a vigente. Validação em `issuePrescription` (autor, ids, data, eixo 0–180, ao menos um grau ou observação, tipo de uso). Implementação local e persistência entregues na F3-07 (`c2f0c27`): tabela `prescriptions` (Dexie v13), UI por olho na `ClinicalWorkspacePage` (seção "Refração (OD/OE)") e backup com `schema: 13` (schemas 10–12 importam com `prescriptions: []`). F3-06 (`6f2fe74`): seletor de tipo de uso, botão "Retificar" com motivo obrigatório na workspace, snapshot `SalePrescription` (`salePrescriptionSnapshot`) copiado na criação do orçamento no caixa (`Sale.prescription`) e validação/FK desse snapshot no backup.

## Permissions

`clinical.workspace.access` em lista, workspace e menu.

## Dependencies

Attendance fornece `attendanceId`; storage usa `clinicalRecords`, `clinicalVersions`, a tabela `prescriptions` (Dexie v13) e a tabela `attachments` (conteúdo por id).

## Public API

`ClinicalService` e `ClinicalRepository`; funções puras de prescrição (`issuePrescription`/`retifyPrescription`/`activePrescription`/`prescriptionUsageLabels`) em `clinical.ts` + `PrescriptionRepository`; para o caixa, `salePrescriptionSnapshot` em `sales.ts` e `SalesService.listCustomerPrescriptions`.

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

→ ClinicalWorkspacePage (campo texto do ClinicalRecord, seção "Refração (OD/OE)", tipo de uso e retificação) + ClinicalRecord + regra de finalize; prescrição estruturada: `clinical.ts` (`issuePrescription`/`retifyPrescription`) + `LocalPrescriptionRepository` + snapshot de venda em `sales.ts`/`CashWorkspacePage`.

### Alterar regras de anexo (tipo/tamanho/categoria)

→ `clinical.ts` (`ATTACHMENT_*`/`assertValidAttachment`) + `clinical-attachments.test.ts`.

### Alterar formulário

→ ClinicalWorkspacePage + `.clinical-form`.

### Alterar persistência

→ ClinicalRepository/LocalClinicalRepository/schema.

### Alterar fila clínica

→ ClinicalQueuePage + AttendanceRepository.

## Related Modules

Attendance; sales consomem a prescrição por snapshot na venda (`Sale.prescription`, F3-06); futuramente work-orders se consumirem prescrição.
