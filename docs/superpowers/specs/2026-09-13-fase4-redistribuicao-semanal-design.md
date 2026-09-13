# CONTAkcal — Fase 4: Redistribuição Semanal + Dashboard (design)

## Objetivo

Implementar o motor de disponibilidade dinâmica (spec original seção 5.2) e
substituir os dados mockados restantes (`WeekView`) por dados reais, incluindo
a faixa de dias com correção retroativa (visualizar/remover refeições).

## Bloco semanal global (`src/lib/nutrition/week.ts`)

`getProtocolWeekInfo(protocolStartedAt, now)` calcula blocos fixos de 7 dias
corridos contados desde a conclusão do onboarding — **não** desde o início da
fase atual (que é uma numeração separada, `phaseState.phaseWeekIndex`, usada
só para a lógica de estagnação da Fase 6). Isso exigiu adicionar
`protocolStartedAt` como campo próprio no documento do usuário (a Fase 2 só
guardava `phaseState.startedAt`, que reinicia a cada troca de fase).

`availableToday(metaSemanal, consumidoDiasAnteriores, diasRestantes)`
implementa a fórmula exata da spec original. Ambas funções são puras e
testadas (Vitest) — a matemática de datas é fácil de errar em off-by-one.

## Escopo por métrica

- **Proteína e Água**: não entram na redistribuição — meta fixa diária
  (já era assim desde a Fase 2/3, mantido).
- **Calorias e Carboidrato**: meta semanal = meta diária × 7.
- **Gordura**: a meta armazenada (`fatGoal`) já É a meta semanal por
  definição da spec original (`1g × peso — meta semanal`) — não multiplicar
  por 7 de novo. Isso corrige um atalho temporário da Fase 3 (que dividia
  `fatGoal` por 7 só para ter algo para mostrar antes desta fase existir).

## `useWeekProgress` (`src/lib/firestore/useWeekProgress.ts`)

Um único listener Firestore (`subscribeWeekMeals`, desde `weekStart`) serve
tanto a aba "Hoje" (via `consumedPreviousDays`, usado no cálculo de
disponibilidade) quanto a aba "Semana" (via `weekTotalsSoFar` e
`mealsByDay`, agrupamento por dia 1-7 usado na faixa de dias).

## Faixa de dias — escopo desta fase

Implementado: visualizar refeições de qualquer dia já passado da semana
(dias futuros ficam desabilitados) e remover uma refeição individual.

**Cortado por escopo**: "adicionar" uma refeição retroativa a um dia passado
via chat de IA. O fluxo do chat (Fase 3) foi desenhado em torno de "hoje";
estender para datas arbitrárias exigiria uma segunda instância do modal de
chat parametrizada por data, o que temos base para fazer (`addMeal` já
aceita um `at?: Date` opcional), mas não implementamos a UI ainda. Editar um
item específico de uma refeição já salva também não foi implementado — o
padrão continua sendo remover e registrar de novo.

## Verificação

- Testes unitários: 6 novos casos cobrindo `getProtocolWeekInfo` (dia 1,
  último dia, virada de semana) e `availableToday` (sem consumo, com sobra
  do dia anterior, sem dias restantes).
- Verificação end-to-end no navegador com um `AuthContext` de teste
  (`protocolStartedAt` 3 dias atrás): confirmado Semana 1 / Dia 4,
  disponibilidade de calorias hoje = 6.032 kcal (= 24.129 meta semanal ÷ 4
  dias restantes, batendo com o cálculo manual), metas semanais de
  carboidrato (3.591g = 513g/dia × 7) e gordura (82g, sem multiplicar)
  corretas, navegação entre dias da faixa funcionando.

## Fora de escopo (fases futuras)

Água (Fase 5), pesagem/relatórios/estagnação (Fase 6), alerta de calorias
baixas, adicionar refeição retroativa via chat.
