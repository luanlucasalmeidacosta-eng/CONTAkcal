# CONTAkcal — Relatório Mensal + Histórico de Fase (design)

Extensão da Fase 6, feita via TDD estrito (RED-GREEN a cada função, teste
por teste), fechando a lacuna documentada no spec da Fase 6.

## Lógica pura (TDD)

- `getWeekStartDate` (`week.ts`): generaliza `getProtocolWeekInfo` pra
  calcular a data de início de qualquer semana `N`, não só a atual — pré-
  requisito pra tudo abaixo. `getProtocolWeekInfo` foi refatorado pra
  reusar essa função (sem duplicar a matemática de datas).
- `getPhaseForWeek` (`phaseHistory.ts`): dado um histórico de trocas de
  fase, determina qual fase estava em vigor no início de uma semana
  específica.
- `getMonthForWeek` / `getWeeksForMonth` / `summarizePhasesByWeek`
  (`monthlyReport.ts`, já existentes): agrupamento de blocos de 4 semanas
  em meses e formatação da divisão de fases (ex: "3 semanas de Bulking + 1
  semana de Cutting").

**Achado durante o TDD**: o primeiro teste de `getPhaseForWeek` com troca de
fase falhou por um motivo errado — não na lógica de produção, mas porque o
teste misturava um timestamp UTC fixo com a matemática de "meia-noite
local" que `getWeekStartDate` usa. Em fuso diferente de UTC (o ambiente
roda em America/Bahia, UTC-3) isso desalinha a comparação por até algumas
horas. Corrigido derivando o timestamp do teste a partir da própria função
testada, em vez de um valor fixo — mais correto e também mais representativo
de uso real.

## Histórico de fase (persistência)

Novo campo `phaseHistory: PhaseHistoryEntry[]` no documento do usuário
(`{phase, startedAt}`), semeado no onboarding com a fase inicial e
apendado a cada troca. Isso preenche a lacuna identificada antes: sem
histórico, não havia como saber "qual fase valia numa semana passada".

Nova função `changePhase` (`users.ts`) — a troca de fase que a spec 4.2 já
previa como manual, mas que nunca tinha UI própria. Reinicia a numeração de
semana da fase e o contador de estagnação, igual ao onboarding faz na
primeira vez.

## UI

- `PhaseChangeCard` (aba Ajustes): mostra a fase atual e um formulário de
  troca reaproveitando os componentes do onboarding (`ChoiceButton`,
  `PrimaryButton`, `NumberField` — decisão consciente de importar da pasta
  `onboarding` em vez de extrair pra um local compartilhado, pra não abrir
  uma refatoração maior nesta entrega).
- `MonthlyReportSection` (aba Relatórios): navegação entre meses (setas,
  limitada ao mês atual), agregando as semanas já iniciadas daquele mês via
  busca única no Firestore (`getMealsInRange`, sem listener — meses
  passados não mudam em tempo real).

## Limitação assumida (documentada na própria UI)

O relatório mensal usa a **meta calórica atual** para todas as semanas do
mês, mesmo que a fase tenha mudado no meio dele. Reconstruir a meta
histórica exata exigiria guardar `adjustmentKcal`/`recompIntent` em cada
entrada do `phaseHistory` e recalcular via `applyPhaseAdjustment` — viável,
mas escopo cortado aqui pra não encadear mais uma dependência.

## Achado ao testar (aplicado): loading infinito

`useMonthlyReport` não tratava falha do Firestore — sem `try/catch`, uma
promise rejeitada (ex: sem permissão) deixava `loading` travado em `true`
pra sempre, sem nenhum feedback. Mesmo padrão de bug já visto e corrigido
nas Fases 4/5 (rejeições não capturadas), agora também presente aqui;
corrigido com estado de erro explícito.

## Verificação

- 4 novos testes unitários (`getWeekStartDate`: 2 casos; `getPhaseForWeek`:
  2 casos) — total do projeto sobe pra 32 testes.
- Verificação end-to-end no navegador: troca de fase mostrando o formulário
  condicional certo por fase escolhida; navegação entre meses sem quebrar;
  erro do relatório mensal exibido corretamente (esperado, sem auth real
  neste ambiente) em vez de loading infinito.
