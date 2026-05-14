"""Tests for db_service - deduplication logic."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.db_service import retrieve_context


def test_dedup_no_results():
    """Empty results should return empty list when repo has no data."""
    result = retrieve_context([0.0] * 384, n_results=3, repo_url="https://github.com/nonexistent/repo-that-does-not-exist")
    assert result == []
