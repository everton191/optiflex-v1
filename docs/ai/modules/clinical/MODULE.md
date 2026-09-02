# Clinical

## Purpose

Abrir atendimentos da fila, editar prontuário e registrar anamnese, exame, solicitações, prescrição, anexos e finalização.

## Directory

Páginas em `src/app/pages.tsx`; domínio em `clinical.ts` e `clinical-service.ts`; persistência no repository clínico.

## Routes

- `/clinico`
- `/clinico/atendimento/:attendanceId`

## Main Pages

`ClinicalQueuePage`, `ClinicalWorkspacePage`.

## Components

`Button`, textarea nativo, `.clinical-form`, `.form-actions`, listas.

## Services

`ClinicalService.load`, `save`, `finalize`.

## Repositories

`ClinicalRepository` / `LocalClinicalRepository`.

## Stores / Hooks

Sem store/hook. O rascunho fica em `useState` até salvar.

## Models

`ClinicalRecord`, `ClinicalAttachment`.

## Permissions

`clinical.workspace.access` em lista, workspace e menu.

## Dependencies

Attendance fornece `attendanceId`; storage usa `clinicalRecords`.

## Public API

`ClinicalService` e `ClinicalRepository`.

## Shared Components

Button, AppShell, feedback e classes de formulário.

## Files Normally Modified

- Formulário: `ClinicalWorkspacePage`.
- Finalização: `clinical-service.ts`.
- Modelo: `clinical.ts`.
- Persistência: `LocalClinicalRepository` + schema se mudar.

## Avoid Modifying

Não criar módulos fictícios separados para prescription/exams: hoje são campos do ClinicalRecord. Não armazenar arquivo binário como metadado.

## Common Tasks

### Alterar prescrição

→ ClinicalWorkspacePage + ClinicalRecord + regra de finalize.

### Alterar formulário

→ ClinicalWorkspacePage + `.clinical-form`.

### Alterar persistência

→ ClinicalRepository/LocalClinicalRepository/schema.

### Alterar fila clínica

→ ClinicalQueuePage + AttendanceRepository.

## Related Modules

Attendance; futuramente sales/work-orders se consumirem prescrição.
