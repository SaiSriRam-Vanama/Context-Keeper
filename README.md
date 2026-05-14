# 🧠 Context Keeper — AI-Powered Codebase Intelligence

> **Understand any GitHub repository instantly.** Ask questions in plain English, explore architecture visually, and onboard contributors in minutes — powered by RAG (Retrieval-Augmented Generation) with local LLMs.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green)
![Ollama](https://img.shields.io/badge/Ollama-phi3:mini-orange)

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [⚙️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Local)](#quick-start-local)
  - [Docker Deployment](#docker-deployment)
- [🔌 API Reference](#-api-reference)
- [📊 Data Pipeline](#-data-pipeline)
- [🛡️ Anti-Hallucination System](#️-anti-hallucination-system)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👤 Author](#-author)

---

## ✨ Features

| Feature | Description |
|---|---|
| **🔍 RAG Q&A Chat** | Ask natural-language questions about any ingested repo. Answers are grounded strictly in the codebase — zero hallucinations. |
| **🏛️ Architecture Visualizer** | Auto-generates interactive dependency graphs from source code imports using ReactFlow. |
| **📈 Decision Timeline** | Monthly commit / issue / PR activity charts rendered with Recharts. |
| **👥 Contributor Map** | Identifies top contributors and their areas of expertise. |
| **🧭 Code Navigator** | Full file-tree browser for any ingested repository. |
| **🚀 Smart Onboarding** | AI-generated 5-step onboarding plan for new contributors. |
| **📂 File Viewer** | Read any file from an ingested repo directly in the browser. |
| **⚡ Streaming Responses** | Real-time token-by-token answer streaming via SSE. |
| **🔄 Ingestion Pipeline** | Clone → Process → Chunk → Embed → Store in under 2 minutes. |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        🌐 User (Browser)                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   🎨 Frontend (Next.js 16 + React 19)                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ ChatInterface │  │ Architecture │  │   TimelineVisualizer     │  │
│  │  (RAG QA)     │  │   Diagram    │  │  (Recharts charts)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                  │                      │                  │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴───────────────┐  │
│  │CodeNavigator │  │ContributorMap│  │   SmartOnboarding         │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │
│         │                                                           │
│         └──────────────┬────────────────────────────────────────────┘
│                        │            HTTP / SSE
│                        ▼
│              ┌───────────────────┐
│              │   api.ts (Axios)  │
│              │  :3000 → :8000    │
│              └───────────────────┘
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                     HTTP / SSE
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ Backend (FastAPI + Uvicorn :8000)                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     routes.py (API Router)                     │   │
│  │  /health  /ingest-repo  /ask  /ask/stream  /timeline          │   │
│  │  /contributors  /architecture  /tree  /file  /onboarding      │   │
│  │  /repos  /repos/{id}  /ingestion-status                       │   │
│  └───────────┬──────────────────┬──────────────────┬─────────────┘   │
│              │                  │                  │                 │
│              ▼                  ▼                  ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │ llm_service  │   │  db_service  │   │  ingestion_service    │    │
│  │ (Ollama)     │   │ (ChromaDB)   │   │ (Git + GitHub API)    │    │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘    │
│         │                  │                       │                │
│         ▼                  ▼                       ▼                │
│  ┌────────────┐   ┌──────────────┐   ┌─────────────────────────┐   │
│  │embedding   │   │ processor    │   │   GitPython / PyGithub  │   │
│  │_service    │   │ _service     │   │   (clone, issues, PRs)  │   │
│  └────────────┘   └──────────────┘   └─────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│  🤖 Ollama Server   │   │  🗄️ ChromaDB (Persistent)    │
│  (phi3:mini)        │   │  (cosine similarity index)  │
│  Port 11434         │   │  chroma_data/               │
└─────────────────────┘   └─────────────────────────────┘
```

### Data Flow

#### 📥 Ingestion Pipeline
```
GitHub Repo → Clone → Process Files → Chunk Text → Generate Embeddings → Store in ChromaDB
                   ↘ Extract Timeline / Contributors / Architecture → Cache as JSON
```

#### 🔍 Q&A Pipeline
```
User Query → Embed Query → ChromaDB Retrieval (top-N chunks → dedup per file)
         → Build Strict Prompt → Ollama Inference → Hallucination Check → Answer
```

---

## ⚙️ Tech Stack

### 🖥️ Backend

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) 0.135 | Async web framework |
| **Server** | [Uvicorn](https://www.uvicorn.org/) 0.42 | ASGI server |
| **LLM Runtime** | [Ollama](https://ollama.ai/) + phi3:mini | Local LLM inference |
| **Vector DB** | [ChromaDB](https://www.trychroma.com/) 1.5.5 | Persistent vector storage (cosine similarity) |
| **Embeddings** | [Sentence-Transformers](https://www.sbert.net/) (all-MiniLM-L6-v2) | Text embeddings |
| **Git** | [GitPython](https://gitpython.readthedocs.io/) 3.1.46 | Repository cloning & analysis |
| **GitHub API** | [PyGithub](https://pygithub.readthedocs.io/) 2.8.1 | Issues & PRs fetching |
| **ML Backend** | [PyTorch](https://pytorch.org/) 2.10 | Embedding model runtime |
| **Validation** | [Pydantic](https://docs.pydantic.dev/) 2.12 | Data models & validation |
| **HTTP Client** | [httpx](https://www.python-httpx.org/) 0.28 + [requests](https://requests.readthedocs.io/) 2.32 | API communication |
| **Testing** | [pytest](https://docs.pytest.org/) 9.0 | Unit & integration tests |

### 🎨 Frontend

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) 16.1.6 | React framework (App Router) |
| **UI Library** | [React](https://react.dev/) 19.2.3 | Component library |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.x | Type safety |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4 | Utility-first CSS |
| **Diagrams** | [ReactFlow](https://reactflow.dev/) 11.11 | Interactive architecture graphs |
| **Charts** | [Recharts](https://recharts.org/) 3.8 | Timeline visualizations |
| **Icons** | [Lucide React](https://lucide.dev/) 0.577 | Icon components |
| **HTTP** | [Axios](https://axios-http.com/) 1.13 | API client |
| **Linting** | [ESLint](https://eslint.org/) 9 | Code quality |

### 🐳 Infrastructure

| Component | Technology |
|---|---|
| **Containerization** | Docker + Docker Compose (3 services) |
| **LLM Server** | Ollama (phi3:mini, tinyllama) |
| **Vector Store** | ChromaDB (in-process, persistent) |
| **Host OS** | Windows (PowerShell, .bat, .vbs launchers) |

---

## 📁 Project Structure

```
Context-Keeper/
│
├── backend/                          # 🐍 Python FastAPI Backend
│   ├── api/
│   │   └── routes.py                 # All API endpoints
│   ├── services/
│   │   ├── llm_service.py            # Ollama integration + hallucination guard
│   │   ├── embedding_service.py      # Sentence-Transformer embeddings
│   │   ├── db_service.py             # ChromaDB operations
│   │   ├── processor_service.py      # File processing & chunking
│   │   └── ingestion_service.py      # Git clone + metadata extraction
│   ├── tests/
│   │   ├── test_processor.py         # Chunking logic tests
│   │   ├── test_routes.py            # API route tests
│   │   ├── test_db.py                # ChromaDB dedup tests
│   │   ├── test_ingestion.py         # Ingestion status tests
│   │   └── test_e2e_ask.py           # End-to-end Q&A tests
│   ├── chroma_data/                  # Persistent vector store
│   ├── repos/                        # Cloned repositories
│   ├── config.py                     # Settings from environment
│   ├── main.py                       # FastAPI app entry point
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Backend container
│   ├── .env.example                  # Environment template
│   ├── start.bat / start.vbs         # Windows launchers
│   └── start_server.ps1             # PowerShell launcher
│
├── frontend/                         # 🎨 Next.js 16 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── dashboard/page.tsx    # Main dashboard
│   │   │   └── ingest/page.tsx       # Repo ingestion page
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx      # RAG Q&A chat panel
│   │   │   ├── ArchitectureDiagram.tsx # Interactive dependency graph
│   │   │   ├── TimelineVisualizer.tsx  # Activity charts
│   │   │   ├── ContributorMap.tsx      # Contributor analysis
│   │   │   ├── CodeNavigator.tsx       # File tree browser
│   │   │   ├── SmartOnboarding.tsx     # AI onboarding steps
│   │   │   ├── IngestionProgress.tsx   # Progress bar
│   │   │   ├── ErrorBoundary.tsx       # Error fallback UI
│   │   │   └── ToastContainer.tsx      # Toast notifications
│   │   └── lib/
│   │       ├── api.ts                 # Axios API client
│   │       ├── utils.ts               # Tailwind utilities
│   │       └── use-toast.ts           # Toast hook
│   ├── package.json                   # Node dependencies
│   ├── Dockerfile                    # Frontend container
│   ├── next.config.ts                # Next.js configuration
│   ├── tsconfig.json                 # TypeScript config
│   └── .env.example                  # Environment template
│
├── scratch/
│   └── test_ollama.py                # Ollama connectivity test
│
├── docker-compose.yml                # Multi-container orchestration
├── run.ps1                           # Unified project launcher
├── start_servers.ps1                 # Quick server start
├── pytest.ini                        # Test configuration
└── README.md                         # 📄 This file
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Check |
|---|---|---|
| [Python](https://www.python.org/) | 3.11+ | `python --version` |
| [Node.js](https://nodejs.org/) | 20+ | `node --version` |
| [Ollama](https://ollama.ai/) | Latest | `ollama --version` |
| [Docker](https://docker.com/) (optional) | 24+ | `docker --version` |

### Quick Start (Local)

**1. Clone & Setup Environment**
```bash
git clone https://github.com/SaiSriRam-Vanama/Context-Keeper.git
cd Context-Keeper

# Backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r backend/requirements.txt
```

**2. Pull LLM Model**
```bash
ollama pull phi3:mini
```

**3. Configure Environment**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set GITHUB_TOKEN for higher API rate limits (optional)
```

**4. Run Backend**
```bash
cd backend
python main.py
# → http://localhost:8000
```

**5. Run Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

**6. Or use the unified launcher:**
```powershell
.\run.ps1
```

### Docker Deployment

```bash
docker compose up --build
# → Backend: http://localhost:8000
# → Frontend: http://localhost:3000
# → Ollama:   http://localhost:11434
```

> ⚠️ First run will download the `phi3:mini` model (~2.4 GB) inside the Ollama container.

---

## 🔌 API Reference

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health — Ollama status, ChromaDB doc count, config |

### Ingestion

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ingest-repo` | Start background ingestion `{ "repo_url": "https://github.com/..." }` |
| `GET` | `/ingestion-status?repo_url=` | Poll ingestion progress |
| `GET` | `/repos` | List all ingested repositories |
| `DELETE` | `/repos/{repo_id}` | Delete an ingested repo |

### Q&A

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ask` | Ask a question `{ "query": "...", "repo_url": "..." }` |
| `POST` | `/ask/stream` | Streaming version (SSE, token-by-token) |

### Repository Insights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/timeline?repo_url=` | Monthly commit/issue/PR activity |
| `GET` | `/contributors?repo_url=` | Top contributors with expertise areas |
| `GET` | `/architecture?repo_url=` | Auto-generated dependency graph |
| `GET` | `/tree?repo_url=` | File tree browser |
| `GET` | `/file?repo_url=&file_path=` | Read file contents |
| `GET` | `/onboarding?repo_url=` | AI-generated onboarding steps |

---

## 📊 Data Pipeline

### Ingestion Flow
```
1. Clone ──── GitPython clones repo into backend/repos/
2. Process ── Scan supported files (.py, .js, .ts, .md, etc.)
3. Chunk ──── Section-aware splitting (markdown headers → fixed-size with overlap)
4. Filter ─── Remove license boilerplate and low-value chunks
5. Embed ──── Sentence-Transformer all-MiniLM-L6-v2 → 384-dim vectors
6. Store ──── ChromaDB (cosine similarity, persistent on disk)
7. Extract ── Timeline (commits + issues), Contributors, Architecture → JSON cache
```

### Q&A Flow
```
1. User types question
2. Query is embedded using same model
3. ChromaDB retrieves top-2 relevant chunks (1 per file, deduplicated)
4. Strict [INST] prompt built with context (200 chars per chunk)
5. Ollama generates answer (temperature=0, 80 max tokens)
6. Hallucination detector validates every tech term against context
7. Clean answer returned to user
```

---

## 🛡️ Anti-Hallucination System

Context Keeper uses a **three-layer defense** against LLM hallucinations:

### Layer 1: Strict Prompt Engineering
```
[INST] You are a code analyst. Answer ONLY from the context below.
- If context contains the answer, answer concisely.
- If NOT, say EXACTLY: "I don't have enough information about this."
- DO NOT mention any technology not shown in the context.
- DO NOT make up anything. DO NOT speculate. DO NOT infer.
[/INST]
```

### Layer 2: Context Restriction
- Only **200 characters per chunk** — minimal viable context
- **1 chunk per file** — prevents information overload
- **n_results=1** (deduplicated) — maximum focus

### Layer 3: Tech-Term Blacklist
After generation, the answer is scanned for 70+ known technology terms. If any term appears in the answer that was **not present in the original context**, the answer is replaced with `"I don't have enough information about this."`.

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run specific test files
pytest backend/tests/test_processor.py -v
pytest backend/tests/test_routes.py -v
pytest backend/tests/test_e2e_ask.py -v

# Run with coverage (if installed)
pytest --cov=backend/services --cov-report=term-missing
```

**Test coverage includes:**
- Chunking logic (empty, small, overlap, markdown, license filtering)
- API routes (health, ingestion, Q&A, repo listing)
- ChromaDB deduplication
- Ingestion status lifecycle
- End-to-end Q&A with real Ollama inference
- Hallucination detection
- Image stripping from prompts

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes all existing tests and follows the project's coding conventions.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 VANAMA SAI SRI RAM

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👤 Author

**VANAMA SAI SRI RAM**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-saisriramv-blue?style=flat-square&logo=linkedin)](https://linkedin.com/in/saisriramv)
[![GitHub](https://img.shields.io/badge/GitHub-SaiSriRam--Vanama-black?style=flat-square&logo=github)](https://github.com/SaiSriRam-Vanama)

---

> ⚡ **Context Keeper** — Because understanding code shouldn't require reading every line.
