# One certificate per region for coss.com + api.coss.com: the ALB's (CloudFront forwards the
# viewer Host and validates the origin certificate against it) and CloudFront's (us-east-1).
# DNS lives in Cloudflare: add the validation CNAMEs from the `certificate_validation_records`
# output there (they are the same for both regions).

resource "aws_acm_certificate" "alb" {
  domain_name               = var.dashboard_host
  subject_alternative_names = [var.api_host]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "alb" {
  certificate_arn = aws_acm_certificate.alb.arn
}

resource "aws_acm_certificate" "cloudfront" {
  provider                  = aws.us_east_1
  domain_name               = var.dashboard_host
  subject_alternative_names = [var.api_host]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cloudfront.arn
}

# The Hooks portal's host (its own Cloudflare zone): validation CNAME from the
# `portal_certificate_validation_records` output, added DNS-only in that zone.
resource "aws_acm_certificate" "portal" {
  domain_name       = var.portal_host
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "portal" {
  certificate_arn = aws_acm_certificate.portal.arn
}
