from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from config import settings
import threading


def _warmup_model():
    import requests, json, logging
    try:
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": "warmup",
            "stream": False,
            "options": {"num_predict": 1, "num_ctx": 256}
        }
        resp = requests.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json=payload, timeout=settings.OLLAMA_TIMEOUT
        )
        if resp.status_code == 200:
            logging.info(f"Model '{settings.OLLAMA_MODEL}' warmed up successfully")
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from services.llm_service import check_ollama_health
    health = check_ollama_health()
    if health["available"]:
        print(f"Ollama connected: {health['message']}")
        if not health["has_requested_model"]:
            print(f"WARNING: Model '{settings.OLLAMA_MODEL}' not found. Run: ollama pull {settings.OLLAMA_MODEL}")
        else:
            thread = threading.Thread(target=_warmup_model, daemon=True)
            thread.start()
            print(f"Warming up model '{settings.OLLAMA_MODEL}' in background...")
    else:
        print(f"WARNING: Ollama not available. Start with 'ollama serve'")
    yield
    # Shutdown (nothing to do)


app = FastAPI(title="Context Keeper API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=False)

