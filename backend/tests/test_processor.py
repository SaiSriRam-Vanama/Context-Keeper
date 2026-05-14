"""Tests for processor_service - chunking logic."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.processor_service import chunk_text


def test_chunk_text_empty():
    assert chunk_text("", chunk_size=10, overlap=2) == []


def test_chunk_text_small():
    result = chunk_text("hello world", chunk_size=100, overlap=10)
    assert result == ["hello world"]


def test_chunk_text_line_boundary():
    text = "line one\nline two\nline three\nline four\n"
    result = chunk_text(text, chunk_size=15, overlap=5)
    assert len(result) >= 1
    for chunk in result:
        assert isinstance(chunk, str)


def test_chunk_text_overlap():
    text = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n"
    result = chunk_text(text, chunk_size=10, overlap=5)
    assert len(result) > 1
    for i in range(len(result) - 1):
        assert len(result[i]) > 0


def test_chunk_markdown_sections():
    text = "# Project\nIntro.\n## Tech Stack\nPython, FastAPI\n## Setup\nRun this."
    result = chunk_text(text)
    assert len(result) >= 1
    has_tech = any("Tech Stack" in c for c in result)
    assert has_tech, "Markdown section should be preserved"


def test_chunk_filters_license():
    text = "## License\nMIT License. The software is provided 'as is', without warranty of any kind."
    result = chunk_text(text)
    assert len(result) == 0, "License boilerplate should be filtered"


def test_chunk_preserves_content():
    text = "## API\nfrom fastapi import FastAPI\napp = FastAPI()\n@app.get('/')\ndef read_root():\n    return {'hello': 'world'}"
    result = chunk_text(text)
    assert len(result) >= 1
    assert any("FastAPI" in c for c in result)
