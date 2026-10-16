locals {
  # Generated from infra/aws by `bun run --cwd infra aws:spec:write` (a test fails when stale).
  spec = jsondecode(file("${path.module}/spec.json"))

  name     = "coss-${var.stage}"
  services = { for service in local.spec.services : service.name => service }

  # Services behind the load balancer.
  lb_services = { for name, service in local.services : name => service if try(service.port, null) != null }

  # Services behind the network load balancer (plain TCP: the SMTP relay). One target group per
  # container port, one listener per public port.
  nlb_services = { for name, service in local.services : name => service if length(try(service.tcpPorts, [])) > 0 }
  nlb_targets = merge([
    for name, service in local.nlb_services : {
      for port in distinct([for mapping in service.tcpPorts : mapping.container]) :
      "${name}-${port}" => { service = name, port = port }
    }
  ]...)
  nlb_listeners = merge([
    for name, service in local.nlb_services : {
      for mapping in service.tcpPorts :
      tostring(mapping.listener) => { service = name, target = "${name}-${mapping.container}" }
    }
  ]...)

  ses_policy_arns = {
    web    = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-dashboard"
    api    = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-api"
    worker = "arn:aws:iam::${var.account_id}:policy/coss/${var.ses_name}-worker"
  }
}
