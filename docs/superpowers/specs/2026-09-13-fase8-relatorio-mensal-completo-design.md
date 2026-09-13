# CONTAkcal — Fase 8: Relatório Mensal Completo (design)

Fecha as duas lacunas documentadas na Fase 6/relatório mensal.

## 1. Meta histórica por fase

`phaseHistory` (Fase 6) só guardava `{phase, startedAt}` — suficiente pra
saber qual fase valia numa semana, mas não a meta calórica exata daquele
momento (que depende também de `adjustmentKcal`/`recompIntent`).

Estendido para `{phase, startedAt, adjustmentKcal?, recompIntent?}`, e os
três pontos que escrevem no histórico passam a registrar isso:

- `completeOnboarding` e `changePhase` (já escreviam no histórico, só
  faltavam os campos extras).
- `applyStagnationAdjustment` (Fase 6) **passou a escrever no histórico
  também**, mesmo sem trocar de fase — o ajuste de +100kcal por
  estagnação muda a meta calórica dali em diante, então é um evento que
  precisa aparecer na linha do tempo pra reconstrução histórica funcionar.
  Isso não quebra `summarizePhasesByWeek` (Fase 6/TDD), que só lê o campo
  `.phase` — duas entradas seguidas com a mesma fase continuam contando
  como uma fase só na exibição do mês.

`getPhaseForWeek` foi refatorado para reusar uma nova função mais geral,
`getGoalEntryForWeek`, que retorna a entrada inteira (não só a fase) —
evita duplicar a busca por data. Testado via TDD (RED-GREEN) com um caso
novo: duas entradas de Bulking com `adjustmentKcal` diferente (300 → 400,
simulando um ajuste por estagnação no meio do mês) devem retornar o valor
certo por semana.

`useMonthlyReport` agora calcula `calorieGoal`/`carbGoal` **por semana**,
usando a entrada histórica correspondente + `applyPhaseAdjustment` +
`calculateCarbGoal` — não mais a meta atual multiplicada por semanas
avaliadas. Proteína e gordura continuam usando a meta atual (dependem do
peso, que tem sua própria história em `weigh_ins`, não em `phaseHistory` —
reconciliar as duas séries temporais é uma correção maior, deixada de
fora aqui).

## 2. Gráfico de peso de longo prazo (spec 11.3)

`WeightHistoryChart` — SVG customizado (sem lib de gráficos, seguindo o
mesmo padrão do `Ring.tsx`: hand-rolled pra bater com a estética
"Dark AI"). Pontos espaçados por índice (não por data real — mais simples
e a spec só pede o "panorama geral", não precisão de escala temporal),
com distinção visual exigida pela spec: círculo preenchido = pesagem
mensal oficial, círculo vazado (stroke only) = semanal opcional.

Colocado em `ReportsView` como seção própria, antes do relatório semanal
— igual a spec pede ("existe como seção própria... o panorama geral antes
de entrar mês a mês").

## Verificação

- 1 novo teste unitário (`getGoalEntryForWeek`) via TDD estrito.
- Verificação end-to-end no navegador com histórico simulando uma troca
  Bulking→Cutting na semana 3: gráfico de peso renderizou corretamente
  com 3 pontos cheios (mensal) e 2 vazados (semanal) intercalados,
  conectados por linha, tendência de perda de peso visível.
- Relatório mensal com meta histórica não pôde ser verificado com dados
  reais (mesma limitação de sempre — sem auth real neste ambiente), mas
  a matemática está coberta pelos testes unitários e o carregamento
  falha graciosamente (sem travar) quando o Firestore nega acesso.
