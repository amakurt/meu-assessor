---
name: glassmorphism-ui
description: Sistema de design Glassmorphism Dark UI para o Meu Assessor OS / KIT OS. Use ao criar ou editar telas, modais, cards, badges, animações e responsividade em CSS puro e Vanilla JS.
---

# Glassmorphism Dark UI System

Diretrizes visuais e arquitetura de componentes de interface para o Meu Assessor OS (`styles/main.css` e `index.html`).

---

## 🎨 Paleta e Variáveis Centrais

O design adota uma estética executiva escura com acentos translúcidos, blur de fundo e gradientes sutis:

```css
:root {
    --bg-base: #07090e;
    --bg-surface: #0e131f;
    --bg-card: rgba(20, 27, 45, 0.7);
    --border: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(255, 255, 255, 0.16);
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
    --text-dim: #64748b;
    --emerald: #10b981;
    --cyan: #06b6d4;
    --accent-purple: #8b5cf6;
}
```

---

## 💎 Princípios do Glassmorphism

1. **Camadas com Backdrop Filter**:
   - Utilize `backdrop-filter: blur(12px) saturate(180%)` em cards, modais e barra de navegação.
   - Aplique bordas sutis translúcidas (`1px solid rgba(255, 255, 255, 0.08)`) para demarcar os limites sem poluição visual.

2. **Componentes Executivos**:
   - **Cards de Métricas**: Destaque para números grandes (`Outfit` ou `Plus Jakarta Sans`, 600/700), labels menores em caixa alta e badges de status coloridos (Verde = positivo, Vermelho = alerta, Azul/Roxo = informativo).
   - **Modais e Overlays**: Transições suaves de fade e scale (`transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`). Fechamento rápido por tecla `Esc` ou clique fora.
   - **Simulador de WhatsApp**: Balões com micro-interações, timestamps e botões de ação em formato pílula.

3. **Responsividade e PWA**:
   - Mobile-first com suporte a telas sensíveis ao toque (alvos de toque >= 44px).
   - Respeite as safe areas de celulares (`viewport-fit=cover`, `padding-bottom: env(safe-area-inset-bottom)`).
   - Sem frameworks pesados: construído com HTML5 semântico, Vanilla JavaScript reativo e CSS nativo.
