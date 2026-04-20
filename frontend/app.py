"""
Streamlit frontend for News RAG system.
Run: streamlit run frontend/app.py
"""

import os
import streamlit as st
import httpx

API_URL = os.getenv("API_URL", "http://localhost:8000")


SECTION_ICONS = {
    "News": "🌍",
    "Sport": "⚽",
    "Business": "💼",
    "Technology": "💻",
    "Entertainment & Arts": "🎭",
    "Science": "🔬",
    "Health": "🏥",
    "Travel": "✈️",
}

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(page_title="BBC News RAG", page_icon="📰", layout="wide")

# ── Header ────────────────────────────────────────────────────────────────────
st.title("📰 BBC News RAG System")
st.caption("Semantic retrieval over BBC News (2023–2024) · all-MiniLM-L6-v2 + FAISS + Llama 3")

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Settings")
    top_k = st.slider("Top-K results", min_value=1, max_value=20, value=5)
    mode = st.radio("Mode", ["Search only", "RAG (Search + Generate)"])

    st.divider()
    st.markdown("#### About")
    st.markdown(
        "**Course**: CS6120 Natural Language Processing\n\n"
        "**Team**\n"
        "- Zhidian Wang\n"
        "- Zhenghan Jing\n\n"
        "**Dataset**: [BBC News AllTime](https://huggingface.co/datasets/RealTimeData/bbc_news_alltime)  \n2023-01 ~ 2024-06"
    )

# ── Main input ────────────────────────────────────────────────────────────────
st.markdown("#### Your query")
query = st.text_area(
    label="query",
    label_visibility="collapsed",
    height=100,
    placeholder="e.g. UK government warns of AI risks to public safety and national security",
)

search_clicked = st.button("Search", type="primary", disabled=not query.strip())

# ── Search ────────────────────────────────────────────────────────────────────
if search_clicked:
    with st.spinner("Retrieving..."):
        try:
            if mode == "Search only":
                resp = httpx.post(
                    f"{API_URL}/search",
                    json={"query": query, "top_k": top_k},
                    timeout=30,
                )
                resp.raise_for_status()
                results = resp.json()["results"]
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
    for r in results:
        icon = SECTION_ICONS.get(r["section"], "📄")
        score_pct = f"{r['score'] * 100:.1f}%"
        title_preview = r["title"] if r["title"] else r["text"][:80]
        with st.expander(f"{icon} [{r['section']}] {score_pct} — {title_preview}"):
            st.write(r["text"])
            meta_cols = st.columns(2)
            if r["published_date"]:
                meta_cols[0].caption(f"Published: {r['published_date']}")
            meta_cols[1].caption(f"Cosine similarity: {r['score']:.4f}")
            if r["link"]:
                st.markdown(f"[Read full article →]({r['link']})")
