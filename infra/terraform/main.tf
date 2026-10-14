locals {
  # Generated from infra/aws by `bun run --cwd infra aws:spec:write` (a test fails when stale).
  spec = jsondecode(file("${path.module}/spec.json"))

  name     = "coss-${var.stage}"
  services = { for service in local.spec.services : service.name => service }

  # Services behind the load balancer.
  lb_services = { for name, service in local.services : name => service if try(service.port, null) != null }

  ses_policy_arns = {
    web    = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-dashboard"
    api    = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-api"
    worker = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-worker"
  }
}
