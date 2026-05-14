import os
import re

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".md", ".json",
    ".html", ".css", ".java", ".cpp", ".c", ".h", ".go", ".rs"
}

IGNORE_DIRS = {
    ".git", "node_modules", "venv", "__pycache__", "build", "dist",
    "coverage", ".next", ".vscode", ".idea"
}

LOW_VALUE_PATTERNS = [
    r"the software is provided \"as is\"",
    r"without warranty of any kind",
    r"in no event shall the authors",
    r"liability, whether in an action of contract",
    r"copyright \(c\) \d{4}",
    r"permission is hereby granted",
    r"above copyright notice",
    r"mit license",
    r"apache license",
    r"bsd license",
]


def _is_low_value_chunk(text: str) -> bool:
    """Check if a chunk is mostly boilerplate (license, copyright, etc.)."""
    lowered = text.lower()
    matches = 0
    for pattern in LOW_VALUE_PATTERNS:
        if re.search(pattern, lowered):
            matches += 1
    # If more than 2 boilerplate patterns match, skip it
    return matches >= 2


def process_repository(repo_path: str):
    documents = []
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if not content.strip():
                        continue
                    documents.append({
                        "id": rel_path,
                        "type": "file",
                        "path": rel_path,
                        "content": content,
                        "extension": ext
                    })
                except Exception as e:
                    print(f"Skipping {file_path}: {e}")
    return documents


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    """Section-aware chunking. For markdown, splits on ## headers first."""
    lines = text.splitlines(keepends=True)
    chunks = []

    # For markdown files, try section-based splitting first
    if any(line.startswith("## ") or line.startswith("# ") for line in lines):
        sections = _split_markdown_sections(text)
        for section in sections:
            section_chunks = _line_chunk(section, chunk_size, overlap)
            chunks.extend(section_chunks)
    else:
        chunks = _line_chunk(lines, chunk_size, overlap)

    # Filter low-value chunks
    chunks = [c for c in chunks if not _is_low_value_chunk(c)]

    return chunks


def _split_markdown_sections(text: str) -> list[str]:
    """Split markdown into sections at ## headers."""
    sections = []
    current = []
    for line in text.splitlines(keepends=True):
        if line.startswith("## ") and current:
            sections.append("".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("".join(current))
    return sections if sections else [text]


def _line_chunk(lines: list[str], chunk_size: int, overlap: int) -> list[str]:
    """Split lines into fixed-size chunks with overlap."""
    chunks = []
    current_chunk = []
    current_len = 0

    for line in lines:
        line_len = len(line)
        if current_len + line_len > chunk_size and current_chunk:
            chunks.append("".join(current_chunk))
            overlap_lines = []
            overlap_len = 0
            for l in reversed(current_chunk):
                if overlap_len + len(l) > overlap:
                    break
                overlap_lines.insert(0, l)
                overlap_len += len(l)
            current_chunk = overlap_lines
            current_len = overlap_len

        current_chunk.append(line)
        current_len += line_len

    if current_chunk:
        chunks.append("".join(current_chunk))

    return chunks
