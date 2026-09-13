# CONTAkcal by @vixeluan

App de acompanhamento nutricional com registro de refeições em linguagem
natural (via IA), motor de periodização (Manutenção/Bulking/Cutting/
Recomposição Corporal) e condicionamento calórico semanal dinâmico.

Veja os specs de cada fase de desenvolvimento em
[`docs/superpowers/specs`](docs/superpowers/specs).

## Stack

- Vite + React + TypeScript + Tailwind CSS
- Firebase (Auth Google + Firestore)
- Vercel Functions como proxy para a API do Gemini

## Rodando localmente

```bash
npm install
cp .env.example .env.local  # preencher com as chaves reais
npm run dev
```

A função `/api/parse-meal` (chat de IA) e `/api/generate-summary`
(resumo motivacional) só rodam sob `vercel dev` ou em produção na Vercel —
o `vite dev` puro não serve rotas `/api`.

## Testes

```bash
npm run test       # Vitest — lógica de negócio (DRI, fases, semana, estagnação)
npm run typecheck  # TypeScript
```
