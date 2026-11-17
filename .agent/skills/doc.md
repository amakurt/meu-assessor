# Antigravity Skills

> **Guia para criação e uso de Skills no Antigravity Kit**

---

## 📋 Introdução

Embora os modelos de linguagem sejam versáteis e poderosos, eles não conhecem o contexto específico do seu projeto ou os padrões exclusivos da sua equipe. Carregar todas as regras ou ferramentas de uma vez na janela de contexto gera sobrecarga ("context bloat"), latência elevada e aumento de custos.

O **Antigravity Skills** resolve este problema aplicando o princípio de **Progressive Disclosure** (Divulgação Progressiva):
- Cada skill é um módulo de conhecimento especializado empacotado em uma pasta.
- Permanece em repouso até que sua descrição seja acionada pelo pedido do usuário.
- O conteúdo detalhado só entra no contexto quando estritamente necessário.

---

## 📁 Estrutura e Escopo

As skills são baseadas em diretórios com a seguinte estrutura recomendada:

```
.agent/skills/minha-skill/
├── SKILL.md      # (Obrigatório) Metadados YAML (name, description) e instruções
├── scripts/      # (Opcional) Scripts Python ou Shell executáveis
├── references/   # (Opcional) Documentação, templates ou exemplos
└── assets/       # (Opcional) Diagramas ou arquivos auxiliares
```

---

## 🔍 Exemplo: Criando uma Skill Prática

### 1. Criar o diretório
```bash
mkdir -p .agent/skills/code-review
```

### 2. Criar o arquivo `SKILL.md`
```markdown
---
name: code-review
description: Revisa alterações de código buscando bugs, regras de negócio e boas práticas.
---

# Code Review Skill

Ao revisar código, siga estas etapas:

1. **Corretude**: O código faz exatamente o que é esperado?
2. **Casos de Borda**: Cenários de erro e falhas são tratados?
3. **Padrão do Projeto**: Segue a convenção do projeto (Vanilla JS, Express, SQLite, etc.)?
4. **Performance**: Há consultas lentas ou loops desnecessários?
```

---

## 🎯 Boas Práticas

1. **Descrições Claras e Objetivas:** No frontmatter `description:`, descreva claramente o *quando* e o *o quê* para o modelo rotear corretamente.
2. **Scripts Autocontidos:** Mantenha scripts de validação dentro de `scripts/` da própria skill.
3. **Foco no Domínio:** Evite skills genéricas demais; prefira módulos focados em necessidades reais do projeto.
