#!/usr/bin/env bash
# Rolls services out to an image tag (the commit), waiting until each runs it:
#   infra/scripts/ecs-deploy.sh <tag> api worker web site
# Registers a revision of each service's latest task definition (so environment changes made by
# Terraform ship too) with the new image, updates every service, then waits for them together: the
# deployment circuit breaker rolls failed rollouts back. A service behind the load balancer is done
# once every new task passed its health checks and ECS scaled the old ones to zero (they're only
# draining then); one without (the worker: a running process is all ECS checks) waits until the
# old tasks are gone, so a crash on start can't pass for a deploy.
source "$(dirname "$0")/lib.sh"

tag="${1:?usage: ecs-deploy.sh <tag> <service...>}"
shift
[ "$#" -gt 0 ] || { echo "no services given" >&2; exit 2; }

# Parallel to "$@" (macOS ships bash 3, which has no associative arrays).
revisions=()
for service in "$@"; do
  revision="$(register_with_image "$service" "$tag")"
  revisions+=("$revision")
  aws ecs update-service --cluster "$CLUSTER" --service "$service" \
    --task-definition "$revision" --query service.serviceName --output text >/dev/null
  echo "$service → ${revision##*/}"
done

index=0
for service in "$@"; do
  revision="${revisions[$index]}"
  index=$((index + 1))
  deadline=$((SECONDS + 1200))
  while :; do
    state="$(aws ecs describe-services --cluster "$CLUSTER" --services "$service" --output json \
      | jq -r --arg arn "$revision" '
          .services[0] as $service
          | $service.deployments as $all
          | ($all | map(select(.taskDefinition == $arn))[0]) as $ours
          | if $ours == null or $ours.rolloutState == "FAILED" then "failed"
            elif $ours.rolloutState == "COMPLETED" and ($all | length) == 1 then "done"
            elif ($service.loadBalancers | length) > 0
              and $ours.status == "PRIMARY"
              and $ours.desiredCount > 0 and $ours.runningCount == $ours.desiredCount
              and ($ours.failedTasks // 0) == 0
              and ($all | map(select(.taskDefinition != $arn) | .desiredCount) | all(. == 0))
              then "serving"
            else "waiting" end')"
    case "$state" in
      done) echo "$service is running $tag"; break ;;
      serving) echo "$service is serving $tag (old tasks draining)"; break ;;
      failed)
        echo "$service: the rollout to $tag failed (rolled back). Recent events:" >&2
        aws ecs describe-services --cluster "$CLUSTER" --services "$service" \
          --query 'services[0].events[:8].message' --output text >&2
        exit 1 ;;
    esac
    [ "$SECONDS" -lt "$deadline" ] || { echo "$service: still rolling out after 20 minutes" >&2; exit 1; }
    sleep 5
  done
done
