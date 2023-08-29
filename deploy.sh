#!/bin/bash
# Deploys code to Google Cloud Run
# Expects the following environment variables, in order to work
# - GCR_PROJECT_ID
# - GCR_IMAGE
# - GCR_SERVICE
# - GCR_REGION

# Sets project
gcloud config set project $GCR_PROJECT_ID
echo "==> Has set project" $GCR_PROJECT_ID
# Pushes image
gcloud builds submit --verbosity=debug --tag gcr.io/$GCR_PROJECT_ID/$GCR_IMAGE
echo "==> Has submited Docker image" $GCR_IMAGE
# Deploys image to given service
gcloud run deploy $GCR_SERVICE --verbosity=debug --image gcr.io/$GCR_PROJECT_ID/$GCR_IMAGE:latest --platform managed --region=$GCR_REGION --set-env-vars NODE_ENV=$NODE_ENV --labels env=$NODE_ENV --allow-unauthenticated
