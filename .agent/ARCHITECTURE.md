# Antigravity Kit Architecture

> Comprehensive AI Agent Capability Expansion Toolkit

---

## 📋 Overview

Antigravity Kit is a modular system consisting of:

- **20 Specialist Agents** - Role-based AI personas
- **36 Skills** - Domain-specific knowledge modules
- **11 Workflows** - Slash command procedures

---

## 🏗️ Directory Structure

```plaintext
.agent/
├── ARCHITECTURE.md          # Visão Geral da Arquitetura
├── agents/                  # 15 Agentes Especialistas Ativos
├── skills/                  # Skills Especializadas (incluindo Baileys, SQLite, Pluggy, Glassmorphism)
├── workflows/               # Procedimentos de Comandos Slash
├── rules/                   # Regras Globais (GEMINI.md)
├── scripts/                 # Scripts Mestres de Validação (checklist.py, session_manager.py)
└── archive/                 # Agentes e Skills Arquivados (não relacionados à stack)
```

---

## 🤖 Agentes Especialistas Ativos (15)

Personas de IA calibradas e focadas no ecossistema do **Meu Assessor OS**:

| Agente | Foco Principal | Skills Vinculadas |
| ------ | -------------- | ----------------- |
| `orchestrator` | Coordenação multi-agente e síntese | parallel-agents, behavioral-modes, architecture |
| `project-planner` | Descoberta, planejamento e divisão de tarefas | brainstorming, plan-writing, architecture |
| `backend-specialist` | Node.js, Express, Baileys, Pluggy, APIs REST | nodejs-best-practices, baileys-whatsapp, open-finance-pluggy |
| `database-architect` | SQLite, WAL Mode, better-sqlite3, schemas | database-design, better-sqlite3 |
| `frontend-specialist` | Vanilla JS, PWA, Glassmorphism Dark UI | frontend-design, glassmorphism-ui, web-design-guidelines |
| `debugger` | Análise de causa-raiz e correção de bugs | systematic-debugging, clean-code |
| `devops-engineer` | PM2, deploy, environment, segurança de runtime | deployment-procedures, server-management |
| `security-auditor` | Validação de payloads, OWASP, segredos | vulnerability-scanner, red-team-tactics |
| `test-engineer` | Testes de fluxos conversacionais e APIs | testing-patterns, tdd-workflow, webapp-testing |
| `performance-optimizer` | Latência sub-milissegundo, cache, assets | performance-profiling |
| `seo-specialist` | PWA manifest, meta tags executivas | seo-fundamentals, geo-fundamentals |
| `documentation-writer` | SESSION.md, manuais, referências de API | documentation-templates |
| `product-owner` | Regras de negócio, paridade de assessores | plan-writing, brainstorming |
| `code-archaeologist` | Refatoração de legado e descontinuação segura | clean-code, code-review-checklist |
| `explorer-agent` | Auditoria profunda e mapeamento de código | architecture, systematic-debugging |

*(Nota: Agentes não relacionados como `game-developer` e `mobile-developer` foram arquivados em `.agent/archive/` para eliminar ruído).*

---

## 🧩 Skills Principais do Meu Assessor OS

| Skill | Descrição e Aplicação |
| ----- | --------------------- |
| `baileys-whatsapp` | Conexão WhatsApp, autenticação multi-file, QR Code, recibos de 24h, áudios e anti-ban |
| `better-sqlite3` | SQLite de alta performance, WAL mode, transações atômicas e prepared statements |
| `open-finance-pluggy` | Sincronização bancária Pluggy, categorização de lançamentos e webhooks |
| `glassmorphism-ui` | Sistema de design dark mode, backdrop-filter blur, cards executivos e CSS puro |
| `clean-code` | Padrões de código enxuto, direto e sem over-engineering |
| `brainstorming` | Protocolo Socratic Gate para decisões técnicas |
| `testing-patterns` | Testes unitários e de integração de fluxos conversacionais |

### Backend & API

| Skill | Description |
| ----- | ----------- |
| `api-patterns` | REST, GraphQL, tRPC |
| `nestjs-expert` | NestJS modules, DI, decorators |
| `nodejs-best-practices` | Node.js async, modules |
| `python-patterns` | Python standards, FastAPI |

### Database

| Skill | Description |
| ----- | ----------- |
| `database-design` | Schema design, optimization |
| `prisma-expert` | Prisma ORM, migrations |

### TypeScript/JavaScript

| Skill | Description |
| ----- | ----------- |
| `typescript-expert` | Type-level programming, performance |

### Cloud & Infrastructure

| Skill | Description |
| ----- | ----------- |
| `docker-expert` | Containerization, Compose |
| `deployment-procedures` | CI/CD, deploy workflows |
| `server-management` | Infrastructure management |

### Testing & Quality

| Skill | Description |
| ----- | ----------- |
| `testing-patterns` | Jest, Vitest, strategies |
| `webapp-testing` | E2E, Playwright |
| `tdd-workflow` | Test-driven development |
| `code-review-checklist` | Code review standards |
| `lint-and-validate` | Linting, validation |

### Security

| Skill | Description |
| ----- | ----------- |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics` | Offensive security |

### Architecture & Planning

| Skill | Description |
| ----- | ----------- |
| `app-builder` | Full-stack app scaffolding |
| `architecture` | System design patterns |
| `plan-writing` | Task planning, breakdown |
| `brainstorming` | Socratic questioning |

### Mobile

| Skill | Description |
| ----- | ----------- |
| `mobile-design` | Mobile UI/UX patterns |

### Game Development

| Skill | Description |
| ----- | ----------- |
| `game-development` | Game logic, mechanics |

### SEO & Growth

| Skill | Description |
| ----- | ----------- |
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization |

### Shell/CLI

| Skill | Description |
| ----- | ----------- |
| `bash-linux` | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell |

### Other

| Skill | Description |
| ----- | ----------- |
| `clean-code` | Coding standards (Global) |
| `behavioral-modes` | Agent personas |
| `parallel-agents` | Multi-agent patterns |
| `mcp-builder` | Model Context Protocol |
| `documentation-templates` | Doc formats |
| `i18n-localization` | Internationalization |
| `performance-profiling` | Web Vitals, optimization |
| `systematic-debugging` | Troubleshooting |

---

## 🔄 Workflows (11)

Slash command procedures. Invoke with `/command`.

| Command | Description |
| ------- | ----------- |
| `/brainstorm` | Socratic discovery |
| `/create` | Create new features |
| `/debug` | Debug issues |
| `/deploy` | Deploy application |
| `/enhance` | Improve existing code |
| `/orchestrate` | Multi-agent coordination |
| `/plan` | Task breakdown |
| `/preview` | Preview changes |
| `/status` | Check project status |
| `/test` | Run tests |
| `/ui-ux-pro-max` | Design with 50 styles |

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

### Enhanced Skills (with scripts/references)

| Skill | Files | Coverage |
| ----- | ----- | -------- |
| `typescript-expert` | 5 | Utility types, tsconfig, cheatsheet |
| `ui-ux-pro-max` | 27 | 50 styles, 21 palettes, 50 fonts |
| `app-builder` | 20 | Full-stack scaffolding |

---

## � Scripts (2)

Master validation scripts that orchestrate skill-level scripts.

### Master Scripts

| Script | Purpose | When to Use |
| ------ | ------- | ----------- |
| `checklist.py` | Priority-based validation (Core checks) | Development, pre-commit |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agent/scripts/checklist.py .

# Full verification before deployment
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

### What They Check

**checklist.py** (Core checks):

- Security (vulnerabilities, secrets)
- Code Quality (lint, types)
- Schema Validation
- Test Suite
- UX Audit
- SEO Check

**verify_all.py** (Full suite):

- Everything in checklist.py PLUS:
- Lighthouse (Core Web Vitals)
- Playwright E2E
- Bundle Analysis
- Mobile Audit
- i18n Check

For details, see [scripts/README.md](scripts/README.md)

---

## 📊 Statistics

| Metric | Value |
| ------ | ----- |
| **Total Agents** | 20 |
| **Total Skills** | 36 |
| **Total Workflows** | 11 |
| **Total Scripts** | 2 (master) + 18 (skill-level) |
| **Coverage** | ~90% web/mobile development |

---

## 🔗 Quick Reference

| Need | Agent | Skills |
| ---- | ----- | ------ |
| Web App | `frontend-specialist` | nextjs-react-expert, frontend-design |
| API | `backend-specialist` | api-patterns, nodejs-best-practices |
| Mobile | `mobile-developer` | mobile-design |
| Database | `database-architect` | database-design, prisma-expert |
| Security | `security-auditor` | vulnerability-scanner |
| Testing | `test-engineer` | testing-patterns, webapp-testing |
| Debug | `debugger` | systematic-debugging |
| Plan | `project-planner` | brainstorming, plan-writing |
