"""
Build FAISS index from AG News dataset.
Runtime: ~5-10 min on M4 (MPS), ~3-5 min on L4 GPU.
Output: indexes/faiss.index, indexes/metadata.json
"""

import json
import os
import sys
from pathlib import Path

import faiss
import numpy as np
import torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

INDEX_DIR = Path(__file__).parent.parent / "indexes"
INDEX_DIR.mkdir(exist_ok=True)

FAISS_PATH = INDEX_DIR / "faiss.index"
META_PATH = INDEX_DIR / "metadata.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 256


def get_device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main():
    device = get_device()
    print(f"Device: {device}")

    # Load dataset (train split = 120k articles)
    print("Loading AG News dataset...")
    ds = load_dataset("ag_news", split="train")
    print(f"Total articles: {len(ds)}")

    # Build texts and metadata
    label_names = ["World", "Sports", "Business", "Sci/Tech"]
    texts = []
    metadata = []
    for item in ds:
        text = f"{item['text']}"  # already "title. description"
        texts.append(text)
        metadata.append({
            "text": text,
            "label": label_names[item["label"]],
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
        json.dump(metadata, f)

    print(f"Saved index → {FAISS_PATH}")
    print(f"Saved metadata → {META_PATH}")
    print("Done!")


if __name__ == "__main__":
    main()
