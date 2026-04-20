"""
FastAPI backend for RAG news retrieval.
Endpoints:
  POST /search  — retrieve top-k similar news articles
  POST /rag     — retrieve + generate answer via Ollama (llama3)
  GET  /health  — liveness check
"""

import json
import os
from pathlib import Path
from typing import Optional

import faiss
import httpx
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# ── Config ────────────────────────────────────────────────────────────────────
INDEX_DIR = Path(__file__).parent.parent / "indexes"
FAISS_PATH = INDEX_DIR / "faiss.index"
META_PATH = INDEX_DIR / "metadata.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3")
DEFAULT_TOP_K = 5

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="News RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Globals (loaded once at startup) ─────────────────────────────────────────
_model: Optional[SentenceTransformer] = None
_index: Optional[faiss.Index] = None
_metadata: Optional[list] = None


def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


@app.on_event("startup")
async def startup():
    global _model, _index, _metadata

    if not FAISS_PATH.exists() or not META_PATH.exists():
        raise RuntimeError(
            "Index not found. Run: python scripts/build_index.py first."
        )

    device = get_device()
    print(f"Loading embedding model on {device}...")
    _model = SentenceTransformer(MODEL_NAME, device=device)

    print("Loading FAISS index...")
    _index = faiss.read_index(str(FAISS_PATH))

    print("Loading metadata...")
    with open(META_PATH) as f:
        _metadata = json.load(f)

    print(f"Ready. Index size: {_index.ntotal}")


# ── Schemas ───────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    top_k: int = DEFAULT_TOP_K


class SearchResult(BaseModel):
    text: str
    title: str
    section: str
    published_date: str
    link: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


class RagRequest(BaseModel):
    query: str
    top_k: int = DEFAULT_TOP_K


class RagResponse(BaseModel):
    answer: str
    sources: list[SearchResult]


# ── Helpers ───────────────────────────────────────────────────────────────────
def embed_query(text: str) -> np.ndarray:
    vec = _model.encode([text], convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(vec)
    return vec


def retrieve(query: str, top_k: int) -> list[SearchResult]:
    vec = embed_query(query)
    scores, indices = _index.search(vec, top_k)
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        meta = _metadata[idx]
        results.append(SearchResult(
            text=meta["text"],
            title=meta.get("title", ""),
            section=meta.get("section", "General"),
            published_date=meta.get("published_date", ""),
            link=meta.get("link", ""),
            score=float(score),
        ))
    return results


async def call_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"]


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "index_size": _index.ntotal if _index else 0}


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    if not _index:
        raise HTTPException(503, "Index not loaded")
    results = retrieve(req.query, req.top_k)
    return SearchResponse(results=results)


@app.post("/rag", response_model=RagResponse)
async def rag(req: RagRequest):
    if not _index:
        raise HTTPException(503, "Index not loaded")

    sources = retrieve(req.query, req.top_k)

    context = "\n\n".join(
        f"[{i+1}] ({s.section}, {s.published_date}) {s.text}" for i, s in enumerate(sources)
    )
    prompt = f"""You are a news analysis assistant. Based on the following news articles retrieved from a corpus, answer the user's query concisely.

Query: {req.query}

Retrieved Articles:
{context}

Answer (2-3 sentences, reference article numbers where relevant):"""

    try:
        answer = await call_ollama(prompt)
    except Exception as e:
        answer = f"[LLM unavailable: {e}] Top result: {sources[0].text[:200] if sources else 'N/A'}"

    return RagResponse(answer=answer, sources=sources)
