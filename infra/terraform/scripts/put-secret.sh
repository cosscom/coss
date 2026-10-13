#!/usr/bin/env bash
# Sets one key of the stage secret (`coss/<stage>`, a JSON object) without printing its value or
# writing it to disk or putting it in a command line. The value comes from the clipboard, stdin or a
# fresh random key:
#   scripts/put-secret.sh STRIPE_SECRET_KEY --clipboard
#   scripts/put-secret.sh BETTER_AUTH_SECRET --generate
#   printf %s "$value" | scripts/put-secret.sh DATABASE_URL --stdin
# Running tasks read secrets at start: redeploy the services that use it afterwards.
set -euo pipefail

name="${1:?usage: put-secret.sh NAME --clipboard|--stdin|--generate}"
source="${2:?usage: put-secret.sh NAME --clipboard|--stdin|--generate}"
secret_id="coss/${STAGE:-production}"
region="${AWS_REGION:-us-east-2}"

case "$source" in
  --clipboard) value="$(pbpaste)" ;;
  --stdin) value="$(cat)" ;;
  --generate) value="$(openssl rand -base64 32)" ;;
  *) echo "unknown source: $source" >&2; exit 2 ;;
esac
# Trim surrounding whitespace (copied keys often end with a newline).
value="$(printf %s "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
[ -n "$value" ] || { echo "empty value for $name" >&2; exit 1; }

read_secret() {
  local out
  if out="$(aws secretsmanager get-secret-value --region "$region" --secret-id "$secret_id" \
    --query SecretString --output text 2>&1)"; then
    printf %s "$out"
  elif grep -q "ResourceNotFoundException" <<<"$out"; then
    echo '{}' # no value yet
  else
    echo "$out" >&2
    return 1
  fi
}

# Values only travel through pipes: never in a process's arguments (visible to every process of
# the machine, and to tools that log command lines) and never in a file (bash 3's here-strings
# are temporary files). printf is a builtin, so it runs without an argument list of its own.
current="$(read_secret)"
updated="$(printf %s "$current" | jq -c --arg name "$name" --rawfile value <(printf %s "$value") \
  '. + {($name): $value}')"
printf %s "$updated" | aws secretsmanager put-secret-value --region "$region" --secret-id "$secret_id" \
  --secret-string file:///dev/stdin >/dev/null
# Reads are eventually consistent: wait until the new version is what readers get, so the next
# call doesn't start from the previous one (and drop this key).
for _ in $(seq 30); do
  [ "$(read_secret | jq -r --arg name "$name" '.[$name] // empty')" = "$value" ] && break
  sleep 2
done
echo "set $name in $secret_id ($(read_secret | jq -r 'keys | join(", ")'))"
