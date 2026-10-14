# Shared by the ECS scripts: the stage's names and AWS defaults.
set -euo pipefail
STAGE="${STAGE:-production}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
export AWS_PAGER=""
CLUSTER="coss-${STAGE}"

family() { echo "coss-${STAGE}-$1"; }

# Registers a copy of a service's latest task definition with the image tag replaced; prints its ARN.
register_with_image() {
  local service="$1" tag="$2" definition
  definition="$(aws ecs describe-task-definition --task-definition "$(family "$service")" \
    --include TAGS --output json)"
  jq --arg tag "$tag" '
    .tags as $tags
    | .taskDefinition
    | .containerDefinitions |= map(.image = (.image | sub(":[^:/]+$"; "") + ":" + $tag))
    | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities,
          .registeredAt, .registeredBy, .deregisteredAt)
    | if ($tags | length) > 0 then .tags = $tags else . end
  ' <<<"$definition" >"${TMPDIR:-/tmp}/taskdef-$service.json"
  aws ecs register-task-definition --cli-input-json "file://${TMPDIR:-/tmp}/taskdef-$service.json" \
    --query taskDefinition.taskDefinitionArn --output text
}
