#!/usr/bin/env bash
# The Deploy workflow's guard before migrating and rolling out: sets the step output `deploy` to
# false when production already runs a commit that includes $TAG. A job may have waited for another
# run's: never roll production back to an older commit because their turns came out of order (a
# dispatch, EVENT=workflow_dispatch, deploys what it's given). The same commit deploys again, so
# re-running a job that failed after its rollout finishes the later steps.
set -euo pipefail

: "${TAG:?}" "${STAGE:?}" "${EVENT:?}" "${GITHUB_OUTPUT:?}"
deployed="$(aws ssm get-parameter --name "/coss/$STAGE/image-tag" --query Parameter.Value --output text)"
if [ "$EVENT" = push ] && [ "$deployed" != "$TAG" ] && git merge-base --is-ancestor "$TAG" "$deployed" 2>/dev/null; then
  echo "::notice::Production already runs $deployed, which includes this commit. Skipping."
  echo "deploy=false" >> "$GITHUB_OUTPUT"
else
  echo "deploy=true" >> "$GITHUB_OUTPUT"
fi
