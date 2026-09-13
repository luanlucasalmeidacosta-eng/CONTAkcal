# CONTAkcal — Fase 2: Onboarding + Goals Engine (design)

## Contexto

Esta fase foi implementada em cima da base de UI já existente no repositório
(`origin/main`, tema "Dark AI" laranja/escuro gerado via Verdent), reconciliada
com o backend construído na Fase 1 (Firebase Auth + Firestore, proxy Gemini).
A base de UI virou o branch `main` canônico; o trabalho standalone da Fase 1
ficou preservado na tag `backup-fase1-standalone`.

## Objetivo

Fluxo completo: login → coleta de dados físicos → cálculo DRI 2023 → escolha
de fase → metas derivadas → persistência no Firestore → liberação do app
principal (a UI de dashboard já existente, com dados mockados por enquanto).

## Gate de navegação

`App.tsx` não usa React Router (a base de UI já não usa — a navegação de abas
do dashboard é só `useState`; manter consistência em vez de introduzir uma
segunda forma de navegação). Em vez disso, um componente `Gate` decide o que
renderizar com base em `useAuth()`:

- `loading` → tela de loading mínima
- `!firebaseUser` → `LoginView`
- `!userDoc.onboardingCompleted` → `OnboardingFlow`
- caso contrário → `MainApp` (a experiência de abas existente)

## Módulos puros (`src/lib/nutrition/`)

- `dri.ts`: `calculateEER` (8 equações DRI 2023, seção 3.2 da spec original),
  `calculateDerivedGoals` (proteína/gordura/água por kg), `calculateCarbGoal`.
- `phase.ts`: `applyPhaseAdjustment` — encapsula a lógica condicional de
  Manutenção/Bulking/Cutting/Recomposição Corporal.
- Cobertos por testes unitários (Vitest) — são o lugar de maior risco de erro
  de sinal/coeficiente, e são funções puras sem dependência de React/Firebase.

## Onboarding (`src/features/onboarding/`)

Máquina de estado por pilha de `StepId` (não índice numérico), evitando bugs
de recálculo quando a fase escolhida muda o número de steps restantes
(Manutenção pula o step de ajuste; Bulking/Cutting/Recomposição não).

Steps: `weight → height → age → sex → activity → calorie → phase →
(adjustment condicional) → summary`.

Um único método `advance(patch)` aplica o patch e decide o próximo step a
partir dos dados **já mesclados** (evita bug de closure obsoleta que ocorreria
se `update()` e `goNext()` fossem chamadas separadas no mesmo handler).

Validação: idade mínima 19 anos (fórmula DRI 2023 é só para adultos, conforme
spec original seção 3.2).

## Persistência (`src/lib/firestore/users.ts`)

`completeOnboarding(uid, input)` calcula tudo (calórica ajustada pela fase,
proteína/gordura/água) e grava num único `setDoc` merge em `users/{uid}`,
incluindo `phaseState` inicial (semana global/fase = 1) e
`onboardingCompleted: true`. Carboidrato não é persistido — é sempre derivado
on-the-fly a partir da calórica e das metas de proteína/gordura, porque muda
a cada pesagem junto com o peso (mesma decisão da spec original).

## Verificação

- Testes unitários: `npm run test` (Vitest) — 10 testes cobrindo as 8
  equações DRI (2 casos) e as 5 combinações de ajuste de fase.
- Verificação end-to-end manual no navegador (bypass temporário do gate de
  auth, já que o popup do Google não funciona em ambiente automatizado):
  fluxo completo peso→altura→idade→sexo→atividade→calórica→fase→ajuste→resumo
  testado com dados reais (82kg/175cm/28 anos/masculino/ativo/Bulking+300kcal),
  resultado 3.447 kcal / 164g proteína / 513g carboidrato / 82g gordura /
  3.280ml água — todos os valores conferidos manualmente contra a fórmula.

## Fora de escopo (fases futuras)

Chat de registro de refeições (Fase 3), dashboard com dados reais em vez de
mockados, água, relatórios, redistribuição semanal dinâmica, pesagens
subsequentes recalculando metas.
