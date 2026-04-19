#!/usr/bin/env bash
# Stop (delete) the GCP VM to avoid charges.
# Indexes are lost — re-run gcp_deploy.sh to rebuild.
PROJECT_ID="t-decoder-485408-f9"
ZONE="us-central1-a"
VM_NAME="rag-news-l4"

echo "Deleting VM: $VM_NAME ..."
gcloud compute instances delete "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT_ID" --quiet
echo "VM deleted. No more charges for compute."
