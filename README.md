<div align="center">

#  IT Helpdesk AI

### Multi-Agent RAG-Powered IT Support System

A production-grade AI helpdesk built with **LangGraph**, **FastAPI**, **ChromaDB**, **PostgreSQL**, and **React**.  
Four specialized AI agents collaborate to resolve IT issues, create tickets, and escalate when needed.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)

</div>

---

##  Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Docker Setup](#-docker-full-stack)
- [Demo Credentials](#-demo-credentials)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Datasets](#-datasets)
- [Skills Demonstrated](#-skills-demonstrated)
- [License](#-license)

---

##  Overview

IT Helpdesk AI is an intelligent support system that uses **Retrieval-Augmented Generation (RAG)** and a **multi-agent architecture** to provide accurate, context-aware IT support. Users can chat with the AI assistant, which automatically searches a knowledge base, generates step-by-step solutions, creates support tickets, and escalates complex issues to human agents.

**Key Highlights:**
-  **4 specialized AI agents** orchestrated via LangGraph state machine
-  **RAG pipeline** with ChromaDB vector store (1000+ documents)
-  **Smart ticketing** with auto-escalation based on confidence scoring
-  **Real-time messaging** between agents/admins and users on tickets
-  **Role-based access control** (User, Agent, Admin)
-  **Groq-powered LLM** (Llama 3.3 70B) for fast inference

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                          │
│              (Vite + Tailwind CSS + Zustand)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────────┐
│                     FastAPI Backend                             │
│            (JWT Auth · Async SQLAlchemy · CORS)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                  LangGraph Orchestrator                         │
│                                                                 │
│   ┌──────────────┐   ┌─────────────────────┐   ┌────────────┐ │
│   │  Retrieval    │──▶│  Troubleshooting     │──▶│  Ticket    │ │
│   │  Agent        │   │  Agent               │   │  Agent     │ │
│   │  (ChromaDB)   │   │  (Groq LLM)         │   │  (Auto)    │ │
│   └──────────────┘   └─────────────────────┘   └────────────┘ │
│                                                       │         │
│                                              ┌────────▼───────┐ │
│                                              │  Summary Agent │ │
│                                              │  (Reports)     │ │
│                                              └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │PostgreSQL│   │ ChromaDB │   │  Redis   │
    │  (Data)  │   │ (Vectors)│   │ (Cache)  │
    └──────────┘   └──────────┘   └──────────┘
```

### Agent Workflow

```
User Query → Retrieval Agent → Troubleshooting Agent → [Ticket Agent?] → Response
                  │                      │                     │
                  ▼                      ▼                     ▼
           Search ChromaDB       Generate answer        Create ticket if:
           Compute confidence    with KB context         • User requested it
           Return top docs       Detect escalation       • Confidence < 35%
                                                         • High/Critical priority
```

---

##  Features

###  AI Chat Interface
- Multi-turn conversation with memory
- Suggested prompts for common IT issues (VPN, email, passwords, printers)
- Real-time confidence scores per response
- Agent identification badge on each message
- One-click support ticket creation from any conversation
- Conversation summarizer generating structured incident reports

###  RAG Pipeline
- **ChromaDB** vector store with cosine similarity search
- Pre-loaded with **1000 IT support documents** from HuggingFace datasets
- Upload custom company knowledge base documents (`.txt`, `.md`, `.pdf`)
- Automatic chunking + embedding with sentence-transformers
- Fallback local KB if HuggingFace is unavailable

###  Multi-Agent System (LangGraph)
| Agent | Role | Details |
|-------|------|---------|
| **Retrieval Agent** | Knowledge search | Queries ChromaDB, computes similarity confidence |
| **Troubleshooting Agent** | Solution generation | Uses Groq LLM (Llama 3.3 70B) with KB context + chat history |
| **Ticket Agent** | Ticket creation | Auto-creates tickets, detects escalation triggers |
| **Summary Agent** | Incident reports | Generates structured summaries of conversations |

###  Ticket Management
- Full ticket lifecycle: Open → In Progress → Resolved / Escalated / Closed
- **Agent/Admin messaging** — write messages directly to users on their tickets
- **User messaging** — users can reply and communicate with support staff
- Real-time message thread with role badges and timestamps
- Auto-escalation when AI confidence < 35% or priority is High/Critical

###  Admin Dashboard
- Analytics with interactive charts (Recharts)
- KPI cards: total tickets, open, escalated, resolved
- Knowledge base document management
- Ticket filtering by status and priority

###  Authentication & Authorization
- JWT token-based authentication
- Role-based access control: **User**, **Agent**, **Admin**
- Persistent sessions with Zustand + localStorage
- Password hashing with bcrypt

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Zustand, React Router 6 |
| **Backend** | FastAPI, Uvicorn, Pydantic, async SQLAlchemy |
| **AI/ML** | LangGraph, LangChain, ChromaDB, Sentence Transformers |
| **LLM** | Groq API (Llama 3.3 70B Versatile) |
| **Database** | PostgreSQL 16 (asyncpg), ChromaDB (vectors) |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **DevOps** | Docker, Docker Compose |
| **Datasets** | HuggingFace Datasets |

---

##  Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Python** | 3.11+ | Backend runtime |
| **Node.js** | 20+ | Frontend build |
| **Docker** | Latest | PostgreSQL database |
| **Groq API Key** | — | LLM inference ([Get one free](https://console.groq.com)) |

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/IT-Helpdesk-AI.git
cd IT-Helpdesk-AI
```

### Step 2: Start PostgreSQL (Docker)

```bash
docker-compose up -d postgres
```

> This starts PostgreSQL on port **5432** with database `helpdesk`.

### Step 3: Backend Setup

```bash
cd backend

# Create and configure environment file
cp .env.example .env
# Edit .env → Add your GROQ_API_KEY
```

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

```bash
# Seed demo users (run once)
python seed.py

# Start the backend server
uvicorn main:app --reload --port 8000
```

The backend will:
1.  Create all database tables automatically
2.  Initialize ChromaDB vector store
3.  Load 1000 IT support documents from HuggingFace
4.  Start serving on `http://127.0.0.1:8000`

### Step 4: Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Step 5: Open the App 

```
Frontend:  http://localhost:3000
API Docs:  http://localhost:8000/docs
Health:    http://localhost:8000/health
```

---

##  Docker (Full Stack)

Run the entire stack with a single command:

```bash
# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env → Add your GROQ_API_KEY

# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up --build

# Optional: Include Kafka for event streaming
docker-compose --profile kafka up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

##  Demo Credentials

After running `python seed.py`, use these accounts:

| Role | Email | Password | Access |
|------|-------|----------|--------|
|  **Admin** | `admin@company.com` | `admin123` | Full access: Chat, Tickets, Analytics, KB, Messaging |
|  **Agent** | `agent@company.com` | `agent123` | Chat, Ticket Management, KB, Messaging |
|  **User** | `user@company.com` | `user123` | Chat, My Tickets, Reply to agents |

---

##  API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login (returns JWT token) |
| `GET` | `/api/auth/me` | Get current user info |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/message` | Send message to AI assistant |
| `GET` | `/api/chat/conversations` | List user conversations |
| `GET` | `/api/chat/conversations/{id}/messages` | Get conversation messages |
| `POST` | `/api/chat/conversations/{id}/summarize` | Generate incident report |
| `DELETE` | `/api/chat/conversations/{id}` | Delete a conversation |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tickets/` | List tickets (filtered by role) |
| `GET` | `/api/tickets/{id}` | Get ticket detail with messages |
| `PATCH` | `/api/tickets/{id}` | Update ticket status/priority |
| `GET` | `/api/tickets/{id}/messages` | Get ticket message thread |
| `POST` | `/api/tickets/{id}/messages` | Send message on a ticket |
| `GET` | `/api/tickets/stats/summary` | Get ticket statistics |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload KB document |
| `GET` | `/api/documents/` | List knowledge base documents |
| `GET` | `/api/documents/stats` | Get KB statistics |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/dashboard` | Dashboard data |

>  Full interactive API docs available at: **http://localhost:8000/docs**

---

##  Project Structure

```
IT-Helpdesk-AI/
│
├── backend/
│   ├── main.py                         # FastAPI app, lifespan, CORS, root endpoint
│   ├── config.py                       # Pydantic settings (env-based config)
│   ├── seed.py                         # Demo user seeder script
│   ├── requirements.txt                # Python dependencies
│   ├── Dockerfile                      # Backend container
│   ├── .env.example                    # Environment template
│   │
│   ├── agents/                         #  AI Agent modules
│   │   ├── orchestrator.py             # LangGraph StateGraph — routes query through agents
│   │   ├── retrieval_agent.py          # Agent 1: ChromaDB similarity search
│   │   ├── troubleshooting_agent.py    # Agent 2: Groq LLM solution generator
│   │   ├── ticket_agent.py            # Agent 3: Auto ticket creation + escalation
│   │   └── summary_agent.py           # Agent 4: Incident report generator
│   │
│   ├── routers/                        #  API route handlers
│   │   ├── auth.py                     # Register, login, JWT
│   │   ├── chat.py                     # Chat messaging, conversations
│   │   ├── tickets.py                  # Ticket CRUD + messaging thread
│   │   ├── documents.py                # Knowledge base upload/management
│   │   └── analytics.py               # Dashboard analytics
│   │
│   ├── db/
│   │   └── database.py                 # SQLAlchemy models (User, Ticket, Message, TicketMessage, etc.)
│   │
│   └── utils/
│       ├── auth.py                     # JWT creation/verification, bcrypt hashing
│       ├── llm_client.py              # Groq API client (OpenAI-compatible)
│       ├── vector_store.py            # ChromaDB wrapper (init, query, add)
│       └── dataset_loader.py          # HuggingFace dataset loader
│
├── frontend/
│   ├── index.html                      # Entry HTML
│   ├── package.json                    # Node dependencies
│   ├── vite.config.js                  # Vite config (proxy to backend)
│   ├── tailwind.config.js             # Tailwind theme (brand colors)
│   ├── Dockerfile                      # Frontend container (nginx)
│   │
│   └── src/
│       ├── main.jsx                    # React entry point
│       ├── App.jsx                     # Router + auth guards
│       ├── api.js                      # Axios API client
│       ├── index.css                   # Global styles + animations
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx           # Login/Register UI
│       │   ├── ChatPage.jsx            # AI chat interface
│       │   ├── TicketsPage.jsx         # Agent/Admin ticket management + messaging
│       │   ├── MyTicketsPage.jsx       # User ticket view + reply to agents
│       │   ├── AnalyticsPage.jsx       # Admin analytics dashboard
│       │   └── DocumentsPage.jsx       # Knowledge base management
│       │
│       ├── components/
│       │   └── Layout.jsx              # Sidebar navigation + user info
│       │
│       └── store/
│           └── authStore.js            # Zustand auth state (persisted)
│
├── docker-compose.yml                  # Full stack: PostgreSQL, Redis, Backend, Frontend
├── .gitignore
└── README.md
```

---

##  Configuration

All configuration is managed via environment variables in `backend/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection (async) | `postgresql+asyncpg://postgres:postgres@localhost:5432/helpdesk` |
| `GROQ_API_KEY` | Groq API key for LLM | **required** |
| `GROQ_MODEL` | LLM model name | `llama-3.3-70b-versatile` |
| `LLM_PROVIDER` | LLM provider | `groq` |
| `CHROMA_COLLECTION` | ChromaDB collection name | `helpdesk_kb` |
| `SECRET_KEY` | JWT signing secret | (change in production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `1440` (24 hours) |
| `ESCALATION_THRESHOLD` | Confidence threshold for escalation | `0.70` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `KAFKA_ENABLED` | Enable Kafka event streaming | `False` |
| `DEBUG` | Enable debug logging | `False` |

---

##  Datasets

This project uses real IT support datasets from HuggingFace for the knowledge base:

| Dataset | Source | Size | Purpose |
|---------|--------|------|---------|
| [Bitext Customer Support LLM](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset) | HuggingFace | 500+ QA pairs | RAG knowledge base for customer support queries |
| [IT Helpdesk Synthetic Tickets](https://huggingface.co/datasets/Console-AI/IT-helpdesk-synthetic-tickets) | HuggingFace | 500+ records | Ticket examples, categories, and resolution patterns |

> Documents are automatically downloaded and embedded into ChromaDB on first startup.

---

##  Skills Demonstrated

This project showcases the following technical competencies:

| Category | Skills |
|----------|--------|
| **AI/ML** | RAG, Multi-Agent Systems, LangGraph, Prompt Engineering, Confidence Scoring |
| **Backend** | FastAPI, Async Python, SQLAlchemy ORM, JWT Auth, REST API Design |
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand State Management, React Router |
| **Databases** | PostgreSQL (relational), ChromaDB (vector), Redis (caching) |
| **LLM** | Groq API, OpenAI-compatible clients, Llama 3.3 70B |
| **NLP** | Sentence Transformers, Embedding, Cosine Similarity |
| **DevOps** | Docker, Docker Compose, Multi-service orchestration |
| **Data** | HuggingFace Datasets, Data preprocessing, Vector embeddings |
| **Security** | JWT tokens, bcrypt hashing, RBAC, CORS |
| **Architecture** | Event-driven patterns, Agent orchestration, State machines |



<div align="center">

**Built with  using LangGraph, FastAPI, and React**

</div>
