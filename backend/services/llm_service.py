import requests
import json
import logging
import time
import re

from config import settings

OLLAMA_GENERATE_URL = f"{settings.OLLAMA_URL}/api/generate"
OLLAMA_HEALTH_URL = f"{settings.OLLAMA_URL}/api/tags"
MODEL_NAME = settings.OLLAMA_MODEL
OLLAMA_TIMEOUT = settings.OLLAMA_TIMEOUT

LLM_CACHE: dict[str, str] = {}


def _strip_all_images(text: str) -> str:
    text = re.sub(r'!\[.*?\]\([^)]*\)', '', text)
    text = re.sub(r'<img\s[^>]*/?>', '', text)
    text = re.sub(r'<img[^>]*>', '', text)
    return text


# Alias for routes that still import _strip_images
_strip_images = _strip_all_images


def _context_has_content(context_text: str) -> bool:
    return len(context_text.strip()) >= 20


def _build_prompt(context_text: str, query: str) -> str:
    return f"""[INST]You are a code analyst. Answer ONLY from the context below.

Context:
{context_text}

Question: {query}

Rules:
- If the context contains the answer, answer concisely using ONLY that information.
- If the context does NOT contain the answer, say EXACTLY: I don't have enough information about this.
- DO NOT mention any technology not DIRECTLY AND EXPLICITLY shown in the context above.
- DO NOT make up anything. DO NOT speculate. DO NOT infer. Only restate what is written.
[/INST]
Answer:"""


def check_ollama_health() -> dict:
    start = time.time()
    try:
        resp = requests.get(OLLAMA_HEALTH_URL, timeout=5)
        models = resp.json().get("models", [])
        available = [m["name"] for m in models]
        has_model = MODEL_NAME in available or any(m.startswith(MODEL_NAME) for m in available)
        return {
            "available": True,
            "latency_ms": round((time.time() - start) * 1000),
            "models": available,
            "has_requested_model": has_model,
            "message": f"Model '{MODEL_NAME}' {'found' if has_model else 'NOT found'} in Ollama"
        }
    except requests.exceptions.ConnectionError:
        return {"available": False, "latency_ms": 0, "models": [], "has_requested_model": False, "message": "Cannot connect to Ollama"}
    except Exception as e:
        return {"available": False, "latency_ms": 0, "models": [], "has_requested_model": False, "message": str(e)}


def _build_payload(prompt: str, stream: bool = False) -> dict:
    return {
        "model": MODEL_NAME,
        "prompt": _strip_all_images(prompt),
        "stream": stream,
        "options": {
            "num_predict": 80,
            "temperature": 0,
            "num_ctx": 512,
        }
    }


def call_ollama_raw(prompt: str, use_cache: bool = True) -> str:
    if use_cache and prompt in LLM_CACHE:
        return LLM_CACHE[prompt]

    payload = _build_payload(prompt, stream=False)
    try:
        response = requests.post(OLLAMA_GENERATE_URL, json=payload, timeout=OLLAMA_TIMEOUT)
        if response.status_code == 200:
            result = response.json()
            text = result.get('response', '').strip()
            if not text:
                text = "I don't have enough information about this."
            if use_cache:
                LLM_CACHE[prompt] = text
            return text
        return "I don't have enough information about this."
    except requests.exceptions.ConnectionError:
        return "Error: Could not connect to Ollama."
    except requests.exceptions.Timeout:
        return f"Error: Ollama timed out after {OLLAMA_TIMEOUT}s."
    except Exception as e:
        return f"Error: {e}"


def call_ollama_stream(prompt: str):
    payload = _build_payload(prompt, stream=True)
    try:
        with requests.post(OLLAMA_GENERATE_URL, json=payload, stream=True, timeout=OLLAMA_TIMEOUT) as response:
            if response.status_code != 200:
                yield "I don't have enough information about this."
                return
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
    except requests.exceptions.Timeout:
        yield f"\n\n[Ollama timed out after {OLLAMA_TIMEOUT}s.]"
    except Exception as e:
        yield f"\n\n[Error: {e}]"


def generate_answer(query: str, context_chunks: list[dict]) -> str:
    context_text = ""
    for chunk in context_chunks:
        path = chunk['metadata'].get('path', '')
        content = chunk['content']
        if len(content) > 200:
            content = content[:200].rstrip() + " [...]"
        context_text += f"\n[{path}]\n{content}\n"

    if not context_text.strip() or len(context_text.strip()) < 20:
        return "I don't have enough information about this."

    prompt = f"""[INST]You are a code analyst. Answer ONLY from the context below.

Context:
{context_text}

Question: {query}

Rules:
- If the context contains the answer, answer concisely using ONLY that information.
- If the context does NOT contain the answer, say EXACTLY: I don't have enough information about this.
- DO NOT mention any technology not DIRECTLY AND EXPLICITLY shown in the context above.
- DO NOT make up anything. DO NOT speculate. DO NOT infer. Only restate what is written.
[/INST]
Answer:"""

    answer = call_ollama_raw(prompt)

    if answer.lower().strip() == "i don't have enough information about this." or not answer.strip():
        return answer

    ctx_lower = context_text.lower()
    ans_tech = {'python','javascript','typescript','java','c#','csharp','c++','cpp',
                'go','golang','rust','ruby','php','swift','kotlin','scala','dart',
                '.net','asp.net','.net core','dotnet','dot net',
                'react','angular','vue','svelte','next.js','nuxt','remix',
                'django','flask','fastapi','spring','express','node.js','deno',
                'tailwind','bootstrap','sass','jquery',
                'postgresql','postgres','mysql','mongodb','redis','sqlite',
                'docker','kubernetes','k8s','aws','azure','gcp',
                'tensorflow','pytorch','keras','pandas','numpy',
                'graphql','rest','grpc','websocket','linux','windows','macos'}
    for term in ans_tech:
        if term in answer.lower() and term not in ctx_lower:
            logging.warning(f"Hallucination: answer mentions '{term}' not in context")
            return "I don't have enough information about this."

    return answer
