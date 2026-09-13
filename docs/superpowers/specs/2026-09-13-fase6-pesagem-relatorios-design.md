# CONTAkcal — Fase 6: Pesagem + Relatórios (design)

## Objetivo

Fechar o ciclo do protocolo: registrar pesagens (recalculando metas),
detectar estagnação, e mostrar um relatório semanal com resumo gerado por
IA. Escopo reduzido em relação à spec original — ver seção "Cortado".

## Pesagem (`src/lib/firestore/weighIns.ts`, aba Ajustes)

`addWeighIn` grava o registro em `users/{uid}/weigh_ins` **e** já atualiza
`weightKg`/`proteinGoal`/`fatGoal`/`waterGoal` no documento do usuário na
mesma chamada — replicando a fórmula de metas derivadas da Fase 2
(`calculateDerivedGoals`), como a spec original exige ("Efeito de uma nova
pesagem: recalcula automaticamente as metas"). Checkbox de jejum obrigatório
só aparece (e só bloqueia o envio) quando o tipo é "mensal", igual à spec.

## Estagnação (`src/lib/nutrition/stagnation.ts`)

Função pura `computeStagnation`, testada com 5 casos. Implementa a lógica
adaptativa da spec 4.3: se existem pesagens semanais, usa-as (estagnação =
2 semanais seguidas com o mesmo peso, tolerância de 0.1kg pra ruído de
balança); senão, cai para as mensais (estagnação = 1 mensal sem variação).
**Importante**: a spec original deixa claro que a troca de fase em resposta
à estagnação é sempre manual — este indicador só informa, nunca ajusta nada
sozinho.

## Relatório semanal (`src/sections/ReportsView.tsx`)

Todos os itens da spec 11.1 implementados usando dados já existentes das
Fases 4-6 (nenhuma nova modelagem de dados): saldo calórico, média diária,
dias com proteína batida, carboidrato/gordura vs. meta semanal, variação de
peso (compara a pesagem semanal desta semana com a pesagem mais recente
anterior — "sem pesagem registrada" se não houver uma nesta semana), status
de estagnação, e o aviso permanente do Cutting (11.4, só aparece nessa
fase).

## Resumo motivacional (`api/generate-summary.ts`)

Endpoint genérico de geração de texto livre (sem `responseSchema`, ao
contrário do `parse-meal` da Fase 3) — recebe um prompt já montado no
cliente com os números do relatório e devolve 2-3 frases. **Mesmo achado de
truncamento da Fase 3 se repetiu aqui** (mesmo com um prompt e resposta bem
mais curtos): o `thinkingConfig.thinkingBudget` padrão consumia o
`maxOutputTokens` inteiro antes de gerar a resposta visível. Tentei
`thinkingBudget: 0` para desabilitar completamente, mas o modelo
(`gemini-3.6-flash`) rejeita esse valor (`INVALID_ARGUMENT`) — ao que
parece esse modelo exige um mínimo de "pensamento". A combinação que
funcionou de forma consistente: `thinkingBudget: 200` +
`maxOutputTokens: 1500`.

## Cortado da spec original (fast-follow)

- **Relatório mensal agrupado** (11.2): agrupar 4 semanas fixas, indicar
  fases mistas no mês. A base de dados já suporta (basta agregar múltiplos
  `useWeekProgress`), mas a UI de agrupamento não foi construída.
- **Gráfico de longo prazo** (11.3): linha de peso cruzando todos os meses
  com distinção cheio/vazado (pesagem mensal vs. semanal). Precisa de uma
  lib de gráficos ou SVG customizado — não incluído nesta fase.
- **Adicionar pesagem retroativa a uma data passada** — só registro "agora",
  igual ao corte já feito para refeições (Fase 4) e água (Fase 5).

## Verificação

- Testes unitários: 5 novos casos para `computeStagnation` (sem pesagens,
  2 semanais estagnadas, semanais com variação, mensal estagnada,
  tolerância de ruído).
- Testado o prompt do resumo motivacional via curl diretamente (incluindo
  o achado do truncamento).
- Verificação end-to-end no navegador: aba Ajustes (toggle semanal/mensal,
  checkbox de jejum condicional), aba Relatórios (todos os números batendo
  com as metas da Fase 2/4, botão de resumo IA falhando graciosamente sob
  `vite dev` — esperado, mesma limitação da Fase 3 —, aviso do Cutting
  aparecendo só quando a fase é Cutting).
