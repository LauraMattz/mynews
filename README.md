<div align="center">

# 📰 MyNews — Curadoria Inteligente de Notícias

**Plataforma de curadoria automatizada que coleta, filtra, classifica e resume notícias com IA.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

[**🔗 Acessar App**](https://mynews.lovable.app) · [**📝 Criado por Laura Mattos**](https://www.linkedin.com/in/lauramattosc/)

</div>

---

## ✨ Funcionalidades

### 🔄 Pipeline Automatizado
- **Coleta de RSS** — busca artigos de múltiplos feeds configuráveis
- **Filtros inteligentes** — blocklist e termos de relevância para eliminar ruído
- **Classificação por IA** — scores de relevância e categorização automática por pilares temáticos
- **Resumos com IA** — geração de resumos estruturados (Resumo + "Por que importa?")
- **Reputação de fonte** — sistema que aprende com feedback e ajusta recomendações

### 📋 Triagem Interativa
- **Swipe gestures** no mobile (← descartar · aprovar →)
- **Seleção em lote** para aprovar/descartar múltiplos artigos
- **Busca e filtros** em tempo real
- **Feedback visual** com animações direcionais (aprovado → direita, descartado → esquerda)

### 📖 Resumos & Newsletter
- Visualização de resumos com **formatação rica** (negrito, seções)
- **Copiar para clipboard** com um clique
- **Marcar para newsletter** — controle de envio por artigo
- Filtros por **pilar temático**, status de envio e busca textual
- **Colar link manual** para gerar resumo instantâneo

### 📊 Insights & Analytics
- **KPIs em tempo real** — processados, descartados, curtidos, newsletter
- **Gráfico de volume** temporal com filtros de período (7d, 14d, 30d)
- **Distribuição por pilares** (gráfico pizza) e **fontes** (barras horizontais)
- **Rankings** de artigos mais curtidos e resumos mais completos

---

## 🏗️ Arquitetura

```
src/
├── pages/              # Rotas principais
│   ├── Index.tsx       # Dashboard de triagem
│   ├── Summaries.tsx   # Resumos e newsletter
│   ├── Insights.tsx    # Analytics e gráficos
│   └── About.tsx       # Sobre o projeto
├── components/         # Componentes reutilizáveis
│   ├── TriageCard.tsx  # Card com swipe gestures
│   ├── StatsBar.tsx    # KPIs compactos
│   ├── ArticleCard.tsx # Card de artigo com votos
│   ├── FeedManager.tsx # CRUD de feeds RSS
│   ├── TopicManager.tsx # Gerenciar tópicos
│   └── FilterTermsEditor.tsx # Blocklist e relevância
├── hooks/              # Lógica de dados
│   ├── useArticles.ts  # CRUD de artigos + pipeline
│   ├── useFeeds.ts     # Gerenciamento de feeds
│   └── useTopics.ts    # Gerenciamento de tópicos
└── integrations/       # Conexão com backend
    └── supabase/       # Client e tipos auto-gerados

supabase/
├── functions/
│   ├── fetch-news/     # Coleta de RSS
│   ├── classify-articles/ # Classificação por IA
│   ├── summarize-news/ # Geração de resumos
│   └── daily-pipeline/ # Pipeline automatizado completo
└── config.toml         # Configuração do projeto
```

---

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilo** | Tailwind CSS + shadcn/ui |
| **Gráficos** | Recharts |
| **Estado** | TanStack Query (React Query) |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **IA** | Lovable AI (Gemini / GPT) |
| **Deploy** | Lovable Cloud |

---

## 🧠 Sistema de Recomendação

O score de recomendação combina 4 fatores:

| Fator | Peso | Descrição |
|-------|------|-----------|
| **Votos do usuário** | 30% | Feedback positivo/negativo acumulado |
| **Score de IA** | 25% | Classificação automática de relevância |
| **Reputação da fonte** | 25% | Taxa de aprovação histórica do feed |
| **Recência** | 20% | Decai linearmente em 72h |

Artigos rejeitados recebem penalidade de -100, garantindo que não apareçam novamente.

---

## 🚀 Como executar localmente

```bash
# Clonar o repositório
git clone <URL_DO_REPO>
cd mynews

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

---

## 📱 Responsivo

A interface é mobile-first com:
- **Bottom navigation** no mobile
- **Sidebar fixa** no desktop
- **Swipe gestures** para triagem rápida no celular
- Layout adaptável em todas as páginas

---

<div align="center">

**Feito com 💜 por [Laura Mattos](https://www.linkedin.com/in/lauramattosc/) usando [Lovable](https://lovable.dev)**

</div>
