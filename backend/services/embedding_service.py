from sentence_transformers import SentenceTransformer
import warnings
import os

from config import settings

os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore", module="huggingface_hub")

print(f"Loading {settings.EMBEDDING_MODEL} embedding model...")
model = SentenceTransformer(settings.EMBEDDING_MODEL)

def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []
    embeddings = model.encode(chunks, convert_to_numpy=True)
    return [embedding.tolist() for embedding in embeddings]
