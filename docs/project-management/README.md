# Project Management — como funciona o controle do Opticore

Esta pasta é o **sistema permanente de planejamento e acompanhamento** do desenvolvimento. Ela deve sobreviver à perda do chat, à troca de agentes e a reorganizações do código.

## Arquivos

| Arquivo | Função | Quando ler/gravar |
|---|---|---|
| `PROJECT_STATUS.md` | Ponto de retomada (estado real, próxima tarefa, bloqueios, testes). | Sempre no início da sessão; atualizar a cada entrega. |
| `KANBAN.md` | Quadro mestre com as 155 Issues reais, colunas, prioridades e dependências. | Consultar antes de escolher tarefa; mover status nas Issues. |
| `ROADMAP.md` | As 8 fases, marcos de entrega e ordem segura de conclusão. | Consulta estratégica. |
| `DEPENDENCIES.md` | Mapa de dependências (obrigatórias × opcionais) e cadeias críticas. | Antes de iniciar qualquer card com dependência. |
| `DECISIONS.md` | Registro de decisões técnicas/comerciais + decisões pendentes que bloqueiam. | Registrar toda decisão; consultar bloqueios. |
| `RELEASE_CHECKLIST.md` | Checklist de aceite por release (herda o checklist da auditoria A–H). | Antes de qualquer publicação/tag. |
| `CHANGELOG_DEVELOPMENT.md` | Changelog de desenvolvimento por entrega. | A cada merge/entrega relevante. |

## Relação com as outras pastas de docs

- `docs/ai/` — **fonte de verdade técnica** (mapas de arquivos, módulos, rotas, permissões). Não duplicar aqui: este planejamento **referencia** `docs/ai/`.
- `docs/DEVELOPMENT_AUDIT_A_H.md` — auditoria de requisitos (fases A–H da especificação canônica) com evidências e checklist final. Este Kanban usa a taxonomia própria de 8 fases (Etapa 3); a correspondência está em `ROADMAP.md`.
- `docs/architecture/` e `docs/product/` — planos e requisitos por assunto, sempre apontando para `docs/ai/` e para a auditoria em vez de reescrevê-los.

## Regras de ouro

1. **Nenhuma funcionalidade sem Issue correspondente** no quadro.
2. **Nenhum DONE sem evidência** (comando de teste executado + resultado registrado no card/`PROJECT_STATUS.md`).
3. **Nenhum ID inventado** — só números retornados pelo GitHub (`#42`); IDs locais (`F4-18`) resolvem nas tabelas de `KANBAN.md`.
4. **Não duplicar documentação**: se o conteúdo já vive em `docs/ai/`, referencie.
5. **Novo requisito em sessão** → nova Issue em BACKLOG para avaliação do usuário (não expandir escopo do card atual).
6. **Preservar trabalho existente**: nunca sobrescrever branch/commits alheios; commits por fase com arquivos da fase.

## Comandos úteis

```powershell
# estado do repo
git status; git log --oneline -8

# issues por status
gh issue list --repo everton191/optiflex-v1 --label "status/ready" --limit 50
gh issue list --repo everton191/optiflex-v1 --label "status/blocked" --state open

# mover status (substitui a label de status anterior)
gh issue edit 53 --repo everton191/optiflex-v1 --add-label "status/in-progress" --remove-label "status/backlog"
```

## Limitação atual

GitHub Projects V2 indisponível com o token atual (falta `read:project`/`project`). Enquanto isso: Issues = cards, `KANBAN.md` = quadro. Procedimento de migração no final de `KANBAN.md`.
