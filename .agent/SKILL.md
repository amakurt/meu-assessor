---
name: skill-creator
description: Cria, refina e audita skills especializadas no Antigravity Kit. Use quando precisar criar novas skills, otimizar gatilhos ou empacotar conhecimento específico no projeto.
---

# Antigravity Skill Creator

Este módulo guia a criação, refinamento e documentação de skills no ecossistema Antigravity.

---

## 🎯 Ciclo de Criação de uma Skill

1. **Definição de Escopo**:
   - Qual problema a skill resolve?
   - Quais arquivos, tecnologias ou fluxos ela orienta?
   - Qual é a persona de agente mais adequada para utilizá-la?

2. **Estrutura Padrão**:
   ```
   .agent/skills/<skill-name>/
   ├── SKILL.md            # Metadados YAML + Princípios e regras práticas
   ├── scripts/            # (Opcional) Scripts de validação ou automação
   └── references/         # (Opcional) Exemplos de código e templates
   ```

3. **Frontmatter Obrigatório**:
   ```markdown
   ---
   name: <kebab-case-name>
   description: <Descrição precisa de quando ativar e o que a skill cobre>
   ---
   ```

4. **Princípio de Progressive Disclosure**:
   - Mantenha o `SKILL.md` enxuto e direto ao ponto.
   - Detalhes aprofundados ou listas extensas devem ficar em `references/`.
   - O agente só carrega o que é relevante para o prompt em execução.
