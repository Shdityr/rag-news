#!/usr/bin/env bash
# GCP L4 VM deployment script
# Usage: bash scripts/gcp_deploy.sh
set -euo pipefail

PROJECT_ID="t-decoder-485408-f9"
ZONE="us-central1-a"
VM_NAME="rag-news-l4"
MACHINE_TYPE="g2-standard-8"   # 8 vCPU, 32GB RAM, 1x L4 GPU
DISK_SIZE="100GB"
IMAGE_FAMILY="pytorch-2-4-cu124-ubuntu-2204-py310"
IMAGE_PROJECT="deeplearning-platform-release"

echo "=== Step 1: Create L4 VM ==="
gcloud compute instances create "$VM_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --accelerator="type=nvidia-l4,count=1" \
  --image-family="$IMAGE_FAMILY" \
  --image-project="$IMAGE_PROJECT" \
  --boot-disk-size="$DISK_SIZE" \
  --boot-disk-type="pd-ssd" \
  --maintenance-policy=TERMINATE \
  --metadata="install-nvidia-driver=True" \
  --tags="rag-server" \
  --scopes="default"

echo "=== Step 2: Firewall rules ==="
gcloud compute firewall-rules create allow-rag-ports \
  --project="$PROJECT_ID" \
  --allow=tcp:8000,tcp:8501,tcp:11434 \
  --target-tags="rag-server" \
  --description="RAG API + Streamlit + Ollama" 2>/dev/null || echo "Firewall rule already exists"

echo "=== Step 3: Wait for VM to be ready (60s) ==="
sleep 60

echo "=== Step 4: Copy project to VM ==="
EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
echo "VM IP: $EXTERNAL_IP"

# Sync project (excluding heavy local caches)
gcloud compute scp --recurse \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --exclude=".git,__pycache__,*.pyc,.DS_Store" \
  /Users/shdityr/Documents/NortheasternUniversity/CS6120/6120project/ \
  "${VM_NAME}:/home/user/rag-project"

echo "=== Step 5: Remote setup ==="
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --command="
  set -e
  cd /home/user/rag-project

  # Install Ollama
  curl -fsSL https://ollama.ai/install.sh | sh
  ollama serve &>/tmp/ollama.log &
  sleep 5
  ollama pull llama3

  # Python deps
  pip install -r requirements.txt

  # Build FAISS index (uses CUDA automatically)
  python scripts/build_index.py

  # Start services
  nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 &>/tmp/api.log &
  nohup streamlit run frontend/app.py --server.port 8501 --server.address 0.0.0.0 &>/tmp/streamlit.log &

  echo 'All services started!'
  echo 'API:       http://${EXTERNAL_IP}:8000'
  echo 'Frontend:  http://${EXTERNAL_IP}:8501'
"

echo ""
echo "=== Deployment complete ==="
echo "API:      http://${EXTERNAL_IP}:8000/health"
echo "Frontend: http://${EXTERNAL_IP}:8501"
