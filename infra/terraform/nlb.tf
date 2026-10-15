# The network load balancer of plain-TCP services: the SMTP relay (smtp.coss.com). It forwards
# TCP as is (the relay terminates TLS, for STARTTLS) and preserves client addresses, which the
# relay's per-IP limits need. No WAF or CloudFront can sit in front of SMTP.

resource "aws_lb" "smtp" {
  name                             = "${local.name}-smtp"
  load_balancer_type               = "network"
  internal                         = false
  subnets                          = [for subnet in aws_subnet.public : subnet.id]
  enable_cross_zone_load_balancing = true
  enable_deletion_protection       = true
}

resource "aws_lb_target_group" "tcp" {
  for_each    = local.nlb_targets
  name        = "${local.name}-${each.key}"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  protocol    = "TCP"
  port        = each.value.port
  # Tasks see the client's address (security group: open to the internet on these ports).
  preserve_client_ip = true
  # Matches the service's stopTimeout: messages in progress finish before the task goes.
  deregistration_delay = 120

  health_check {
    protocol            = "TCP"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "tcp" {
  for_each          = local.nlb_listeners
  load_balancer_arn = aws_lb.smtp.arn
  port              = tonumber(each.key)
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp[each.value.target].arn
  }
}
