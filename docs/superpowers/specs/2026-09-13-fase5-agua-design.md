# CONTAkcal — Fase 5: Água (design)

## Objetivo

Substituir a `ComingSoonView` da aba "Água" por um sistema de hidratação
real, independente do fluxo calórico (spec original seção 10).

## Diferença chave em relação a Calorias/Carbo/Gordura

Água **não** usa a redistribuição dinâmica da Fase 4 — cada dia é
totalmente independente, meta fixa diária (`waterGoal`, calculado na Fase 2
como `40ml × peso`). A "semana" existe só para navegação/histórico (mesma
faixa de dias 1-7 sincronizada com o `protocolStartedAt` das outras
métricas, via `getProtocolWeekInfo` reutilizado da Fase 4).

## Estrutura de dados

Nova subcoleção `users/{uid}/water_logs` (`quantidadeMl`, `createdAt`) — já
coberta pela regra genérica de subcoleção do `firestore.rules` (nenhuma
mudança de regras necessária).

## Componentes

- `src/lib/firestore/water.ts`: CRUD + `subscribeWeekWaterLogs` (mesmo
  padrão da Fase 4 — um listener cobre a semana inteira, agrupado por dia
  no cliente).
- `src/lib/firestore/useWaterProgress.ts`: espelha `useWeekProgress`, mas
  para água (total de hoje + agrupamento por dia).
- `src/sections/WaterView.tsx`: anel de progresso diário (reaproveita o
  componente `Ring` — o estado "meta batida" dele já cobre o tom de
  conquista da spec 10.4 sem código extra), botões rápidos +150/+300/+500ml,
  campo de valor customizado, e faixa de dias com total por dia e lista de
  registros removíveis do dia selecionado.

## Achado ao testar (aplicado retroativamente também à Fase 4)

Os handlers de escrita (`addQuick`, `addCustom`, `handleRemove` em
`WaterView`, e `handleRemove` em `WeekView`) não tratavam falhas do
Firestore — um `permission-denied` (ex: sessão expirada) virava uma
rejeição de Promise não capturada, sem feedback nenhum pro usuário. Agora
todos capturam o erro e mostram uma mensagem inline, no mesmo padrão já
usado pelo chat de refeições (Fase 3).

## Fora de escopo (fases futuras)

Adicionar/editar registros de água em dias passados (só remoção, mesmo
corte de escopo da Fase 4), alerta de consumo baixo (depende do threshold
de "ritmo esperado" que a spec original deixa como pendência de
parametrização futura).
