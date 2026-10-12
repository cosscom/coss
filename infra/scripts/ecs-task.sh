#!/usr/bin/env bash
# Runs a one-off command in a service's task definition (its image, environment and network) and
# exits with the command's exit code, printing its logs:
#   infra/scripts/ecs-task.sh worker -- bun packages/db/src/migrate.ts
#   infra/scripts/ecs-task.sh --image-tag <sha> worker -- bun packages/db/src/migrate.ts
#   infra/scripts/ecs-task.sh --task-role <arn> worker -- bun apps/worker/scripts/ses-bootstrap.ts …
#   infra/scripts/ecs-task.sh api -- bun packages/tenancy/scripts/create-admin.ts --email you@…
source "$(dirname "$0")/lib.sh"

tag="" task_role=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --image-tag) tag="$2"; shift 2 ;;
    --task-role) task_role="$2"; shift 2 ;;
    --) shift; break ;;
    *) service="$1"; shift ;;
  esac
done
: "${service:?usage: ecs-task.sh [--image-tag TAG] [--task-role ARN] <service> -- <command…>}"
[ "$#" -gt 0 ] || { echo "no command given" >&2; exit 2; }

if [ -n "$tag" ]; then
  definition="$(register_with_image "$service" "$tag")"
else
  definition="$(aws ecs describe-services --cluster "$CLUSTER" --services "$service" \
    --query 'services[0].taskDefinition' --output text)"
fi
network="$(aws ecs describe-services --cluster "$CLUSTER" --services "$service" \
  --query 'services[0].networkConfiguration' --output json)"
# NUL-separated, so arguments that look like jq options (`--name`) stay arguments.
command_json="$(printf '%s\0' "$@" | jq -Rsc 'split("\u0000")[:-1]')"
overrides="$(jq -nc --arg name "$service" --arg role "$task_role" --argjson command "$command_json" '
  { containerOverrides: [{ name: $name, command: $command }] }
  + (if $role != "" then { taskRoleArn: $role } else {} end)')"

task="$(aws ecs run-task --cluster "$CLUSTER" --task-definition "$definition" --launch-type FARGATE \
  --network-configuration "$network" --overrides "$overrides" --started-by "ecs-task.sh" \
  --query 'tasks[0].taskArn' --output text)"
echo "started ${task##*/} ($*)"
aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$task" || true
while [ "$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$task" --query 'tasks[0].lastStatus' --output text)" != "STOPPED" ]; do
  sleep 10
done

result="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$task" --output json)"
aws logs get-log-events --log-group-name "/coss/${STAGE}/${service}" \
  --log-stream-name "${service}/${service}/${task##*/}" --start-from-head \
  --query 'events[].message' --output text 2>/dev/null | tr '\t' '\n' || true
code="$(jq -r '.tasks[0].containers[0].exitCode // empty' <<<"$result")"
if [ -z "$code" ]; then
  echo "the task stopped without an exit code: $(jq -r '.tasks[0].stoppedReason' <<<"$result")" >&2
  exit 1
fi
echo "exit code $code"
exit "$code"
