from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import traceback
import logging
import os

from services.ingestion_service import (
    clone_repository, extract_timeline_data, extract_contributor_data,
    extract_architecture_data, fetch_issues, REPOS_DIR,
    set_ingestion_status, get_ingestion_status, INGESTION_STATUS
)
from services.processor_service import process_repository, chunk_text
from services.embedding_service import generate_embeddings
from services.db_service import store_embeddings, retrieve_context, get_collection_stats
from services.llm_service import generate_answer, check_ollama_health, call_ollama_raw, call_ollama_stream
from config import settings

router = APIRouter()

logging.basicConfig(level=logging.INFO)

# ── Models ────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    repo_url: str

class AskRequest(BaseModel):
    query: str
    repo_url: str = None

# ── Ingestion Pipeline ────────────────────────────────────────────

def ingest_task(repo_url: str):
    try:
        set_ingestion_status(repo_url, "cloning", "Cloning repository...", 10)
        repo_path = clone_repository(repo_url)

        set_ingestion_status(repo_url, "processing", "Reading source files...", 30)
        documents = process_repository(repo_path)
        logging.info(f"Processed {len(documents)} source files.")

        all_chunks = []
        all_metadata = []
        for doc in documents:
            chunks = chunk_text(doc['content'])
            for chunk in chunks:
                all_chunks.append(chunk)
                all_metadata.append({"path": doc['path'], "extension": doc['extension'], "type": doc['type']})
        logging.info(f"Generated {len(all_chunks)} text chunks.")

        set_ingestion_status(repo_url, "embedding", f"Generating embeddings for {len(all_chunks)} chunks...", 60)
        embeddings = generate_embeddings(all_chunks)

        set_ingestion_status(repo_url, "storing", "Storing in ChromaDB...", 85)
        store_embeddings(embeddings, all_metadata, all_chunks, repo_url)

        set_ingestion_status(repo_url, "complete", "Ingestion complete!", 100)
        logging.info(f"Ingestion successful for {repo_url}")
    except Exception as e:
        logging.error(f"Ingestion failed: {e}")
        traceback.print_exc()
        set_ingestion_status(repo_url, "error", f"Ingestion failed: {str(e)[:200]}", -1)

# ── Health ─────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    ollama = check_ollama_health()
    return {
        "status": "ok",
        "ollama": ollama,
        "chroma_docs": get_collection_stats(),
        "config": {
            "ollama_model": settings.OLLAMA_MODEL,
            "embedding_model": settings.EMBEDDING_MODEL,
        }
    }

# ── Ingestion ─────────────────────────────────────────────────────

@router.get("/ingestion-status")
async def ingestion_status(repo_url: str):
    status = get_ingestion_status(repo_url)
    if not status:
        return {"status": "unknown", "message": "No ingestion found for this repo", "progress": 0}
    return status

@router.post("/ingest-repo")
async def ingest_repo(req: IngestRequest, background_tasks: BackgroundTasks):
    if not req.repo_url or "github.com" not in req.repo_url:
        raise HTTPException(status_code=400, detail="A valid GitHub repository URL is required.")
    background_tasks.add_task(ingest_task, req.repo_url)
    return {"status": "success", "message": f"Repo ingestion initiated for {req.repo_url} in the background."}

# ── Q&A ───────────────────────────────────────────────────────────

@router.post("/ask")
async def ask_question(req: AskRequest):
    if not req.query:
        raise HTTPException(status_code=400, detail="Query string is required.")
    try:
        query_embedding = generate_embeddings([req.query])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate query embedding: {e}")
    try:
        context_chunks = retrieve_context(query_embedding, n_results=2, repo_url=req.repo_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve context: {e}")
    try:
        answer = generate_answer(req.query, context_chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")
    return {"status": "success", "answer": answer, "context_sources": [chunk['metadata'] for chunk in context_chunks]}


@router.post("/ask/stream")
async def ask_question_stream(req: AskRequest):
    if not req.query:
        raise HTTPException(status_code=400, detail="Query string is required.")
    try:
        query_embedding = generate_embeddings([req.query])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate query embedding: {e}")
    try:
        context_chunks = retrieve_context(query_embedding, n_results=2, repo_url=req.repo_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve context: {e}")

    context_text = ""
    for idx, chunk in enumerate(context_chunks):
        path = chunk['metadata'].get('path', 'Unknown file')
        content = chunk['content']
        if len(content) > 500:
            content = content[:500].rstrip() + "\n[truncated]"
        context_text += f"\n--- {path} ---\n{content}\n"

    prompt = f"""Only answer from the code below. If it doesn't answer, say "Not in context."

Code:
{context_text}

Q: {req.query}
A:"""

    return StreamingResponse(call_ollama_stream(prompt), media_type="text/event-stream")

# ── Timeline ──────────────────────────────────────────────────────

@router.get("/timeline")
async def get_timeline(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    if not os.path.exists(target_dir):
        return {"timeline_events": [
            {"date": "2023-01-01", "commits": 10, "issues": 2, "prs": 1},
            {"date": "2023-02-01", "commits": 25, "issues": 5, "prs": 3},
            {"date": "2023-03-01", "commits": 15, "issues": 8, "prs": 2},
            {"date": "2023-04-01", "commits": 40, "issues": 1, "prs": 6},
            {"date": "2023-05-01", "commits": 30, "issues": 4, "prs": 4},
        ]}
    issue_data = fetch_issues(repo_name)
    timeline_events = extract_timeline_data(target_dir, issue_data)
    return {"timeline_events": timeline_events}

# ── Contributors ──────────────────────────────────────────────────

@router.get("/contributors")
async def get_contributors(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    if not os.path.exists(target_dir):
        return {"contributors": [
            {"id": "user1", "name": "Alice Developer", "commits": 150, "expertise": ["backend", "python", "fastapi"]},
            {"id": "user2", "name": "Bob Frontend", "commits": 120, "expertise": ["frontend", "react", "nextjs"]},
            {"id": "user3", "name": "Charlie DevOps", "commits": 80, "expertise": ["docker", "ci-cd", "aws"]}
        ]}
    contributors = extract_contributor_data(target_dir)
    return {"contributors": contributors}

# ── Architecture ──────────────────────────────────────────────────

@router.get("/architecture")
async def get_architecture(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    if not os.path.exists(target_dir):
        return {
            "nodes": [
                {"id": "frontend", "position": {"x": 250, "y": 50}, "data": {"label": "Next.js Frontend"}},
                {"id": "backend", "position": {"x": 250, "y": 150}, "data": {"label": "FastAPI Backend"}},
                {"id": "chroma", "position": {"x": 100, "y": 250}, "data": {"label": "ChromaDB"}},
                {"id": "ollama", "position": {"x": 400, "y": 250}, "data": {"label": "Ollama Phi-3"}}
            ],
            "edges": [
                {"id": "e-front-back", "source": "frontend", "target": "backend", "label": "HTTP API"},
                {"id": "e-back-chroma", "source": "backend", "target": "chroma", "label": "Semantic Search"},
                {"id": "e-back-ollama", "source": "backend", "target": "ollama", "label": "LLM Inference"}
            ]
        }
    architecture = extract_architecture_data(target_dir)
    return architecture

# ── Code Tree ─────────────────────────────────────────────────────

@router.get("/tree")
async def get_tree(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Repository not found.")
    def build_tree(dir_path):
        tree = []
        try:
            for item in sorted(os.listdir(dir_path), key=lambda x: (not os.path.isdir(os.path.join(dir_path, x)), x.lower())):
                if item.startswith('.') or item in ['node_modules', 'venv', '__pycache__']:
                    continue
                path = os.path.join(dir_path, item)
                is_dir = os.path.isdir(path)
                node = {"name": item, "path": os.path.relpath(path, target_dir).replace("\\", "/"), "type": "directory" if is_dir else "file"}
                if is_dir:
                    node["children"] = build_tree(path)
                tree.append(node)
        except Exception:
            pass
        return tree
    return {"tree": build_tree(target_dir)}

# ── File Viewer ───────────────────────────────────────────────────

@router.get("/file")
async def get_file(repo_url: str, file_path: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    full_path = os.path.normpath(os.path.join(target_dir, file_path))
    if not full_path.startswith(os.path.normpath(target_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path.")
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Onboarding ────────────────────────────────────────────────────

@router.get("/onboarding")
async def get_onboarding(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    target_dir = os.path.join(REPOS_DIR, repo_name.replace("/", "_"))
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Repository not found.")

    important_files = []
    priority_names = [
        "readme.md", "readme.rst", "readme.txt",
        "main.py", "app.py", "server.py", "index.py",
        "index.js", "index.ts", "app.js", "app.ts", "server.js", "server.ts",
        "package.json", "pyproject.toml", "setup.py", "requirements.txt",
        "docker-compose.yml", "dockerfile",
    ]

    all_files = []
    ignore_dirs = {".git", "node_modules", "venv", "__pycache__", ".next", "build", "dist"}
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for f in files:
            full_path = os.path.join(root, f)
            rel = os.path.relpath(full_path, target_dir).replace("\\", "/")
            all_files.append(rel)

    def sort_key(path):
        name = path.split("/")[-1].lower()
        depth = path.count("/")
        try:
            priority = priority_names.index(name)
        except ValueError:
            priority = 999
        return (priority, depth)

    all_files.sort(key=sort_key)
    key_files = all_files[:8]

    file_summaries = ""
    for rel_path in key_files:
        full_path = os.path.join(target_dir, rel_path)
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                snippet = f.read(500)
            file_summaries += f"\nFILE: {rel_path}\n```\n{snippet}\n```\n"
        except Exception:
            file_summaries += f"\nFILE: {rel_path}\n(could not read)\n"

    prompt = f"""You are a senior developer onboarding a new team member to a software project called "{repo_name}".
Based on the following key files found in the repository, generate a JSON array of 5 structured onboarding steps.
Each step must help a new developer understand the codebase progressively - from overview to specifics.

Key repository files:
{file_summaries}

Respond ONLY with a valid JSON array (no markdown, no explanation) in this exact format:
[
  {{"id": 1, "title": "Step Title", "description": "Clear 1-2 sentence description of what to read and why it matters.", "file": "relative/path/to/file.ext"}},
  ...
]
Make sure "file" values match exactly one of the filenames listed above."""

    raw = call_ollama_raw(prompt)

    steps = []
    try:
        import json, re as _re
        match = _re.search(r'\[.*\]', raw, _re.DOTALL)
        if match:
            steps = json.loads(match.group())
    except Exception:
        steps = []

    if not steps:
        fallback_labels = [
            ("Start with the README", "Get a high-level overview of the project's purpose, architecture, and setup instructions."),
            ("Explore the Entry Point", "Understand how the application initializes and boots up."),
            ("Review the Core Logic", "Dive into the primary business logic or API layer."),
            ("Check Configuration", "Understand how the project is configured and what dependencies it uses."),
            ("Look at Tests or Docs", "Find any tests or additional documentation that clarify expected behavior."),
        ]
        for i, rel_path in enumerate(key_files[:5]):
            label, desc = fallback_labels[i] if i < len(fallback_labels) else (f"Explore {rel_path}", "Review this key file.")
            steps.append({"id": i + 1, "title": label, "description": desc, "file": rel_path})

    return {"steps": steps}

# ── Repo Management ───────────────────────────────────────────────

@router.get("/repos")
async def list_repos():
    repos = []
    if os.path.exists(REPOS_DIR):
        for entry in os.listdir(REPOS_DIR):
            dir_path = os.path.join(REPOS_DIR, entry)
            if os.path.isdir(dir_path) and not entry.startswith('.'):
                repos.append({"id": entry, "name": entry.replace("_", "/"), "path": dir_path})
    return {"repos": repos}

@router.delete("/repos/{repo_id}")
async def delete_repo(repo_id: str):
    target_dir = os.path.join(REPOS_DIR, repo_id)
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Repository not found.")
    import shutil
    shutil.rmtree(target_dir, ignore_errors=True)
    return {"status": "deleted", "repo_id": repo_id}
