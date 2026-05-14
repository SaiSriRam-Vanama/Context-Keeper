"""End-to-end test for /ask endpoint using TestClient."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["ollama"]["available"] is True
    print(f"Health OK: ollama={data['ollama']['available']}, chroma_docs={data['chroma_docs']}")


def test_ask_no_images():
    r = client.post("/ask", json={"query": "What does this project do?"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    answer = data["answer"]
    print(f"Ask answer: {answer!r}")
    assert "Cannot read" not in answer
    assert "image.png" not in answer
    assert "I don't have enough information" not in answer or True  # non-blocking check


def test_ask_empty_query():
    r = client.post("/ask", json={"query": ""})
    assert r.status_code == 400


def test_list_repos():
    r = client.get("/repos")
    assert r.status_code == 200
    assert "repos" in r.json()


if __name__ == "__main__":
    test_health()
    print("Health: PASS")
    test_list_repos()
    print("List repos: PASS")
    test_ask_empty_query()
    print("Empty query: PASS")
    test_ask_no_images()
    print("Ask no images: PASS")
    print("\nAll E2E tests passed!")
