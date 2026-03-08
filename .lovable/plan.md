

## Plataforma de Notícias com Resumos IA + Slack

### O que será construído

Uma plataforma web que replica o fluxo n8n: busca notícias de feeds RSS, gera resumos usando IA (Lovable AI), exibe num dashboard e envia para o Slack.

### Arquitetura

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Dashboard   │────▶│ Edge Function:   │────▶│ RSS Feeds       │
│  (React)     │     │ fetch-news       │     │ (fontes config.) │
│              │◀────│                  │◀────│                 │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │            ┌────────▼─────────┐
       │            │ Edge Function:   │
       │            │ summarize-news   │──▶ Lovable AI Gateway
       │            └──────────────────┘
       │
       │            ┌──────────────────┐
       └───────────▶│ Edge Function:   │──▶ Slack (connector)
                    │ send-to-slack    │
                    └──────────────────┘
```

### Etapas de implementação

**1. Habilitar Lovable Cloud e conectar Slack**
- Ativar Cloud para usar edge functions e secrets
- Conectar o Slack via connector para envio de mensagens

**2. Edge Function: `fetch-news`**
- Recebe lista de URLs RSS como parâmetro
- Faz fetch dos feeds, parseia XML, extrai título, link, descrição, data
- Retorna array de artigos

**3. Edge Function: `summarize-news`**
- Recebe artigos do fetch-news
- Usa Lovable AI (Gemini 3 Flash) para gerar resumo conciso de cada artigo
- Retorna artigos com campo `summary` adicionado

**4. Edge Function: `send-to-slack`**
- Recebe artigos resumidos + canal destino
- Formata mensagem com blocos Slack (título, resumo, link)
- Envia via connector gateway do Slack

**5. Dashboard (Frontend)**
- **Página principal** com:
  - Lista de feeds RSS configuráveis (adicionar/remover URLs)
  - Botão "Buscar Notícias" que dispara o pipeline
  - Cards com notícias resumidas (título, resumo, fonte, data)
  - Botão "Enviar para Slack" (individual ou em lote)
  - Indicador de loading durante processamento
- Design limpo usando shadcn/ui (Cards, Badge, Button, Input, ScrollArea)

**6. Configurações**
- Campo para selecionar canal do Slack
- Lista editável de feeds RSS com URLs pré-configuradas

### Detalhes Técnicos

- **RSS parsing**: feito na edge function usando DOMParser do Deno
- **IA**: Lovable AI Gateway com modelo `google/gemini-3-flash-preview`, chamada não-streaming via `supabase.functions.invoke()`
- **Slack**: connector gateway em `https://connector-gateway.lovable.dev/slack/api/chat.postMessage`
- **Estado**: React Query para gerenciar fetching e cache das notícias
- **config.toml**: registrar as 3 edge functions com `verify_jwt = false`

### Pré-requisitos do usuário

- Ativar Lovable Cloud
- Conectar o Slack via connector (será solicitado durante implementação)

