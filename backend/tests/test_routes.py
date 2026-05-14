"""Tests for API routes."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "ollama" in data
    assert "chroma_docs" in data


def test_ingest_invalid_url():
    response = client.post("/ingest-repo", json={"repo_url": "not-a-url"})
    assert response.status_code == 400
    assert "valid GitHub" in response.json()["detail"]


def test_ingest_empty_url():
    response = client.post("/ingest-repo", json={"repo_url": ""})
    assert response.status_code == 400


def test_ask_empty_query():
    response = client.post("/ask", json={"query": ""})
    assert response.status_code == 400


def test_list_repos():
    response = client.get("/repos")
    assert response.status_code == 200
    assert "repos" in response.json()
