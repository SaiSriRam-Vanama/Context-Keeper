import chromadb
import uuid
import os

from config import settings

CHROMA_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_data")
os.makedirs(CHROMA_DATA_DIR, exist_ok=True)

client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)

collection = client.get_or_create_collection(
    name=settings.CHROMA_COLLECTION,
    metadata={"hnsw:space": "cosine"}
)

def store_embeddings(embeddings: list[list[float]], metadata_list: list[dict], documents: list[str], repo_url: str = None):
    if not embeddings:
        return
    # Delete old data for this repo before inserting new
    if repo_url:
        existing = collection.get(where={"repo_url": repo_url})
        if existing and existing.get("ids"):
            print(f"Deleting {len(existing['ids'])} old chunks for {repo_url}")
            collection.delete(ids=existing["ids"])
    ids = [str(uuid.uuid4()) for _ in range(len(embeddings))]
    if repo_url:
        for meta in metadata_list:
            meta['repo_url'] = repo_url
    collection.add(embeddings=embeddings, documents=documents, metadatas=metadata_list, ids=ids)

def retrieve_context(query_embedding: list[float], n_results: int = 5, repo_url: str = None):
    query_kwargs = {"query_embeddings": [query_embedding], "n_results": n_results * 3}
    if repo_url:
        query_kwargs["where"] = {"repo_url": repo_url}

    results = collection.query(**query_kwargs)
    if not results['documents'] or not results['documents'][0]:
         return []

    docs = results['documents'][0]
    metas = results['metadatas'][0] if results['metadatas'] else [{}] * len(docs)
    distances = results['distances'][0] if results['distances'] else [0] * len(docs)

    # Deduplicate: only keep 1 chunk per file path
    seen_paths = set()
    contexts = []
    for doc, meta, dist in zip(docs, metas, distances):
        path = meta.get('path', '') if meta else ''
        if path not in seen_paths:
            seen_paths.add(path)
            contexts.append({"content": doc, "metadata": meta, "score": dist})
        if len(contexts) >= n_results:
            break

    return contexts

def get_collection_stats():
    return collection.count()
