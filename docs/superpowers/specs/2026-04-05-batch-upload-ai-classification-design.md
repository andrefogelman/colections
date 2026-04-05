# Design: Upload em Lote com Classificação por IA

## Visão Geral

Modal de upload em lote onde o usuário arrasta N fotos, escolhe a coleção destino, e a IA processa cada foto sequencialmente — criando um item por foto com descrição, embedding e tags automáticas (existentes ou novas).

## Pontos de Entrada

1. **HomePage** — botão "Upload em Lote" no header, ao lado de "Nova Coleção". Abre o modal com seletor de coleção.
2. **CollectionPage** — botão "Importar Fotos" no header da coleção. Abre o modal com a coleção já pré-selecionada.

## Fluxo do Modal

### Etapa 1 — Seleção

- Área de drag-and-drop (reutiliza padrão do PhotoUploader)
- Aceita múltiplos arquivos de imagem
- Se veio da HomePage: dropdown para escolher coleção destino
- Se veio de CollectionPage: coleção já selecionada (editável)
- Botão "Iniciar Processamento"

### Etapa 2 — Processamento Sequencial

Para cada foto, 3 sub-etapas com indicador visual:

1. **Upload** — sobe a foto pro Supabase Storage
2. **IA** — chama `/api/embed-image` para gerar descrição + fingerprint + embedding
3. **Tags** — nova chamada à IA para sugerir tags (existentes ou novas)

UI de progresso (opção C — card focado):
- Card destacado na foto atual com sub-etapas visíveis (upload ✓ → IA... → tags)
- Itens concluídos colapsados em resumo abaixo
- Barra de progresso geral no topo
- Botão "Cancelar" para interromper (itens já criados permanecem)

### Etapa 3 — Conclusão

- Resumo: "8 itens criados, 3 tags novas"
- Botão "Ver na Coleção" para navegar até os itens

## Mudança na API `/api/embed-image`

Adicionar modo `classify` que retorna descrição + fingerprint + embedding + tags sugeridas:

- Recebe lista de tags existentes no sistema como contexto
- Retorna array de tags recomendadas (match com existentes ou novas)
- Prompt adicional no GPT-4O-Mini para extração de tags

## Criação dos Itens

Para cada foto processada com sucesso:

1. Cria item na collection com a descrição gerada
2. Faz upload da foto e vincula ao item (position 0)
3. Salva embedding na foto
4. Cria/vincula tags (upsert para novas, link para existentes)

## Tratamento de Erros

- Se uma foto falha, marca com erro e pula para a próxima
- No resumo final, lista as fotos que falharam com opção de "Tentar novamente"
- Itens criados com sucesso não são afetados por falhas em outras fotos

## Componentes

### Novos
- `BatchUploadModal.tsx` — modal com as 3 etapas
- `BatchProcessingCard.tsx` — card focado da foto sendo processada

### Alterações
- `services/search.ts` — nova função `classifyImage()` que inclui tags
- `api/embed-image.ts` — novo modo `classify`
- `HomePage.tsx` — botão "Upload em Lote"
- `CollectionPage.tsx` — botão "Importar Fotos"

## Decisões de Design

- **1 item por foto** — cada foto vira um item independente na coleção
- **Tags automáticas** — IA pode criar tags novas se nenhuma existente se encaixar
- **Processamento sequencial** — uma foto por vez para evitar rate limits da API
- **Progresso tipo card focado** — destaque na foto atual, resumo dos concluídos
- **Dois pontos de entrada** — HomePage (escolhe coleção) e CollectionPage (coleção pré-selecionada)
