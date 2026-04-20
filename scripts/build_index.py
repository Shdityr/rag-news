"""
Build FAISS index from BBC News AllTime dataset.
Loads selected months (2023-01 to 2024-06) for a recent, manageable corpus.
Runtime: ~5-10 min on L4 GPU.
Output: indexes/faiss.index, indexes/metadata.json
"""

import json
import os
import sys
from pathlib import Path

import faiss
import numpy as np
import torch
from datasets import load_dataset, concatenate_datasets
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

INDEX_DIR = Path(__file__).parent.parent / "indexes"
INDEX_DIR.mkdir(exist_ok=True)

FAISS_PATH = INDEX_DIR / "faiss.index"
META_PATH = INDEX_DIR / "metadata.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 256

# Load 18 months of recent BBC News (manageable size, recent coverage)
MONTHS = [
    "2023-01", "2023-02", "2023-03", "2023-04", "2023-05", "2023-06",
    "2023-07", "2023-08", "2023-09", "2023-10", "2023-11", "2023-12",
    "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
]


def get_device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main():
    device = get_device()
    print(f"Device: {device}")

    # Load dataset (multiple months concatenated)
    print("Loading BBC News AllTime dataset...")
    splits = []
    for month in MONTHS:
        try:
            ds = load_dataset("RealTimeData/bbc_news_alltime", month, split="train")
            # Drop columns with inconsistent types across months (e.g. authors)
            keep = [c for c in ["title", "published_date", "description", "section", "content", "link", "top_image"] if c in ds.column_names]
            ds = ds.select_columns(keep)
            splits.append(ds)
            print(f"  {month}: {len(ds)} articles")
        except Exception as e:
            print(f"  {month}: skipped ({e})")
    ds = concatenate_datasets(splits)
    print(f"Total articles: {len(ds)}")

    # Build texts and metadata
    texts = []
    metadata = []
    for item in ds:
        title = item.get("title") or ""
        description = item.get("description") or ""
        text = f"{title}. {description}".strip(". ")
        if not text:
            continue
        texts.append(text)
        metadata.append({
            "text": text,
            "title": title,
            "section": item.get("section") or "General",
            "published_date": item.get("published_date") or "",
            "link": item.get("link") or "",
        })

    # Load model
    print(f"Loading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME, device=device)

    # Encode in batches
    print("Encoding texts...")
    all_embeddings = []
    for i in tqdm(range(0, len(texts), BATCH_SIZE)):
        batch = texts[i : i + BATCH_SIZE]
        embs = model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
        all_embeddings.append(embs)

    embeddings = np.vstack(all_embeddings).astype("float32")
    print(f"Embeddings shape: {embeddings.shape}")

    # Normalize for cosine similarity (then use IndexFlatIP = dot product)
    faiss.normalize_L2(embeddings)

    # Build FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    print(f"FAISS index size: {index.ntotal}")

    # Save
    faiss.write_index(index, str(FAISS_PATH))
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, ensure_ascii=False)

    print(f"Saved index → {FAISS_PATH}")
    print(f"Saved metadata → {META_PATH}")
    print("Done!")


if __name__ == "__main__":
    main()
