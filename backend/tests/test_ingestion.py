"""Tests for ingestion_service helpers."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ingestion_service import set_ingestion_status, get_ingestion_status


def test_ingestion_status_lifecycle():
    repo_url = "https://github.com/test/repo"
    assert get_ingestion_status(repo_url) is None

    set_ingestion_status(repo_url, "cloning", "Cloning...", 10)
    status = get_ingestion_status(repo_url)
    assert status is not None
    assert status["status"] == "cloning"
    assert status["progress"] == 10

    set_ingestion_status(repo_url, "complete", "Done!", 100)
    status = get_ingestion_status(repo_url)
    assert status["status"] == "complete"
    assert status["progress"] == 100
