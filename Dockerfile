# Multi-stage: build index + run API + frontend
FROM python:3.11-slim

WORKDIR /app

# System deps (FAISS needs libgomp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose ports: 8000 (API) + 8501 (Streamlit)
EXPOSE 8000 8501

# Entrypoint: start API + Streamlit in parallel
CMD ["bash", "-c", "\
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 & \
    streamlit run frontend/app.py --server.port 8501 --server.address 0.0.0.0 \
"]
