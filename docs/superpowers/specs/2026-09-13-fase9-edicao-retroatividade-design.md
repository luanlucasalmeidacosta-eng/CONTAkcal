# CONTAkcal — Fase 9: Edição e Retroatividade (design)

## 1. Editar item de refeição já salva

`EditMealModal` (`src/features/meals/`) — lista os itens da refeição com
campos editáveis (nome, quantidade, kcal/proteína/carbo/gordura por item) e
opção de remover, recalculando os totais ao vivo (mesmo padrão do
`MealConfirmCard`). `updateMeal` (novo em `meals.ts`, via `updateDoc`)
salva `items`/`totals`/`dishName`. Acessível clicando na refeição na faixa
de dias da `WeekView` (antes só dava pra remover).

## 2. Chat de refeição extraído para componente reutilizável

O modal de chat vivia inteiro dentro de `HomeView`. Extraído para
`MealChatModal` (`features/chat/`), parametrizado por:
- `targetDate?: Date` — repassado pro `useMealChat` (que agora aceita esse
  parâmetro) e daí pro `addMeal` como `at`, permitindo registrar refeições
  num dia passado.
- `renderConfirmedFeedback?` — a `HomeView` continua mostrando o feedback
  específico de "hoje" (spec 7.4); a `WeekView`, ao adicionar retroativo,
  mostra uma mensagem genérica (não faz sentido falar de "disponível hoje"
  pra um registro de 3 dias atrás).

`WeekView` ganhou um botão "+ Adicionar refeição neste dia" na faixa de
dias, visível só pra hoje/dias passados (não futuros), abrindo o mesmo
modal com a data do dia selecionado.

## 3. Água retroativa

`WaterView`: os botões +150/300/500ml do topo continuam sempre "agora"
(uso principal, hoje). Um segundo conjunto dos mesmos botões aparece
dentro do painel do dia selecionado, só quando esse dia é passado (não
hoje, não futuro) — grava com `at` igual à data daquele dia.

## 4. Pesagem retroativa — cuidado com sobrescrever a meta atual

Adicionar um campo de data (`<input type="date">`, limitado a não permitir
datas futuras) no formulário de pesagem foi a parte fácil. A parte que
exigiu mais atenção: `addWeighIn` recalcula `proteinGoal`/`fatGoal`/
`waterGoal` a partir do peso registrado — mas se o usuário está
registrando retroativamente uma pesagem **antiga** (ex: "esqueci de
registrar segunda-feira"), não faz sentido sobrescrever as metas atuais
com um peso desatualizado caso já exista uma pesagem mais recente.

`addWeighIn` agora consulta a pesagem mais recente já registrada antes de
gravar, e só atualiza as metas atuais (`weightKg`/`proteinGoal`/etc.) se a
nova pesagem for, pela data informada, a mais recente conhecida.

## Verificação

- Typecheck e os 38 testes unitários existentes continuam passando (essa
  fase foi majoritariamente CRUD + wiring de UI, sem lógica pura nova que
  justificasse testes dedicados).
- Verificação end-to-end no navegador: modal de "adicionar refeição" abre
  com título correto por dia ("Adicionar refeição — Dia 4"); regressão do
  fluxo da `HomeView` confirmada após a extração do `MealChatModal`
  (mensagem de feedback pós-refeição ainda funciona); botões de água
  retroativa aparecem só no dia selecionado, separados dos de "hoje";
  campo de data da pesagem pré-preenchido corretamente.
