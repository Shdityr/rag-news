"""
Streamlit frontend for News RAG system.
Run: streamlit run frontend/app.py
"""

import streamlit as st
import httpx

API_URL = "http://localhost:8000"

st.set_page_config(page_title="News RAG", page_icon="📰", layout="wide")
st.title("📰 News RAG — Similar Article Retrieval")
st.caption("Powered by all-MiniLM-L6-v2 + FAISS + Llama 3 (fully local)")

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Settings")
    top_k = st.slider("Top-K results", min_value=1, max_value=20, value=5)
    mode = st.radio("Mode", ["Search only", "RAG (Search + Generate)"])
    st.divider()
    if st.button("Health check"):
        try:
            r = httpx.get(f"{API_URL}/health", timeout=5)
            st.success(f"API OK — index size: {r.json()['index_size']:,}")
        except Exception as e:
            st.error(f"API unreachable: {e}")

# ── Main input ────────────────────────────────────────────────────────────────
query = st.text_area(
    "Paste a news article or query:",
    height=120,
    placeholder="e.g. Apple announces new MacBook with M4 chip targeting professional users...",
)

if st.button("Search", type="primary", disabled=not query.strip()):
    with st.spinner("Retrieving..."):
        try:
            if mode == "Search only":
                resp = httpx.post(
                    f"{API_URL}/search",
                    json={"query": query, "top_k": top_k},
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                results = data["results"]
                answer = None
            else:
                resp = httpx.post(
                    f"{API_URL}/rag",
                    json={"query": query, "top_k": top_k},
                    timeout=120,
                )
                resp.raise_for_status()
                data = resp.json()
                results = data["sources"]
                answer = data["answer"]
        except Exception as e:
            st.error(f"Error: {e}")
            st.stop()

    # ── RAG answer ────────────────────────────────────────────────────────────
    if answer:
        st.subheader("Generated Answer")
        st.info(answer)
        st.divider()

    # ── Results ───────────────────────────────────────────────────────────────
    st.subheader(f"Top {len(results)} Similar Articles")
    label_colors = {
        "World": "🌍",
        "Sports": "⚽",
        "Business": "💼",
        "Sci/Tech": "🔬",
    }

    for i, r in enumerate(results):
        icon = label_colors.get(r["label"], "📄")
        score_pct = f"{r['score'] * 100:.1f}%"
        with st.expander(f"{icon} [{r['label']}] Similarity: {score_pct}  —  {r['text'][:80]}..."):
            st.write(r["text"])
            st.caption(f"Cosine similarity: {r['score']:.4f}")
