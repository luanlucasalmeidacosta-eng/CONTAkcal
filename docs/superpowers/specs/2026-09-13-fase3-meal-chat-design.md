# CONTAkcal — Fase 3: Chat de Registro de Refeições (IA) (design)

## Objetivo

Substituir o stub fake do modal "Registrar refeição com IA" (já existente na
`HomeView` da base de UI) por um fluxo real: texto livre → Gemini extrai/
decompõe/pergunta o que falta → card de confirmação editável → grava no
Firestore → dashboard atualiza em tempo real.

## Proxy serverless (`api/parse-meal.ts`)

Endpoint único que recebe `{ history, dishLibrary }` e repassa ao Gemini com:

- **System instruction** com as regras da spec original (seção 7): perguntar
  classificação fácil em vez de gramas para pratos compostos, uma pergunta
  por vez, decompor em ingredientes com proporções de referência.
- **`responseSchema`** (JSON estruturado) com `status: "need_info" | "complete"`,
  `question`, `dishName`, `items[]` (name/quantity/kcal/protein/carbs/fat) e
  `totals`.
- **Achado importante durante os testes manuais via curl**: com o
  `thinkingConfig` padrão, o modelo consumia o budget de "pensamento" e
  truncava o JSON de resposta antes de completar (retornando um objeto
  inválido, faltando campos obrigatórios) mesmo reportando `finishReason:
  STOP`. Reduzir `thinkingConfig.thinkingBudget` para 200 e subir
  `maxOutputTokens` para 3000 resolveu — esse é o tipo de tarefa de extração
  estruturada que não se beneficia de "pensar muito", então o budget baixo é
  intencional, não só uma correção de bug.

## Multi-turno

O cliente mantém `history: {role, text}[]` e reenvia tudo a cada resposta do
usuário — sem estado de conversa no servidor (a função é stateless). Isso
espelha o formato nativo de `contents` do Gemini.

## Biblioteca pessoal (`standard_dishes`)

Antes de cada chamada, o cliente busca a biblioteca do usuário
(`getDishLibrary`) e injeta nomes/variantes no prompt como contexto — o
Gemini usa isso como referência de decomposição, mas a IA quem decide se
o prato "bate" com algo salvo (não há matching determinístico no cliente).
Falha ao buscar a biblioteca (ex: erro de rede) não bloqueia o registro da
refeição — a chamada prossegue sem contexto de biblioteca.

## Card de confirmação (`MealConfirmCard`)

- Lista os itens com opção de remover item por item (o caso "não tinha
  queijo" da spec original) — os totais recalculam ao vivo no cliente.
- Campo de nome do prato (editável, pré-preenchido com a sugestão da IA) só
  aparece quando há mais de 1 item (prato composto) — é o que vira entrada
  na biblioteca pessoal ao confirmar.
- Botão "Ajustar" reseta a conversa inteira (spec original: "reescreve a
  descrição do zero"), não tenta editar a mensagem original.

## Persistência

`confirm()` recalcula os totais a partir dos itens finais (pós-remoção),
grava em `users/{uid}/meals`, e se houver nome de prato + mais de 1 item,
faz upsert em `users/{uid}/standard_dishes` (variante `"padrão"` — o fluxo
de variantes por tamanho fica para uma iteração futura).

## Dashboard (Fase 4 parcialmente antecipada)

A `HomeView` (aba "Hoje") passou a consumir dados reais: metas do
`userDoc` (Fase 2) e consumo do dia via `useTodayTotals` (soma reativa das
refeições de hoje, `onSnapshot`). **Simplificação assumida**: o anel de
calorias mostra consumido vs. meta diária simples, e o de gordura usa
meta-semanal/7 como referência diária — a redistribuição dinâmica semanal
completa (seção 5.2 da spec original) é escopo da Fase 4 e não foi
implementada aqui. A aba "Semana" continua com dados mockados.

## Verificação

- Testado o prompt/schema exaustivamente via curl direto contra a API do
  Gemini (turno único e dois turnos, incluindo o bug de truncamento acima).
- Testado o fluxo completo no navegador com `window.fetch` mockado para
  `/api/parse-meal` (necessário porque `vite dev` não serve `/api`, e o
  popup de login Google não funciona no navegador automatizado) e um
  `AuthContext` de teste com usuário/metas falsos — confirmado
  pergunta→resposta→card→remover item→recalcular totais→confirmar→rings
  atualizando via `onSnapshot`.
- **Achado crítico durante esse teste**: a API do Cloud Firestore está
  **desabilitada/nunca usada** no projeto Firebase `contakal` (confirmado via
  `GET https://firestore.googleapis.com/v1/projects/contakal/...` retornando
  `SERVICE_DISABLED`). O banco de dados Firestore provavelmente nunca foi
  criado no console. Isso significa que a escrita "bem-sucedida" observada
  no teste foi só o cache local otimista do SDK — nenhum dado real chegou a
  ser persistido (nada para limpar). **Ação necessária do usuário antes de
  qualquer teste com login real**: criar o banco de dados em Firebase Console
  → Build → Firestore Database → Create database, e publicar as regras de
  `firestore.rules` (colar manualmente ou via Firebase CLI). Sem isso, login,
  onboarding e registro de refeições vão falhar silenciosamente ou travar em
  produção.

## Fora de escopo (fases futuras)

Redistribuição semanal dinâmica completa, variantes de tamanho por prato,
edição de item individual (só remoção), pesagens, água, relatórios, alerta
de calorias baixas.
