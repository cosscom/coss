# Production (coss.com). No secrets here: secret variables live in the `coss/production` Secrets
# Manager secret, the database password is read from the stage secret (DATABASE_URL).

account_id         = "294417174674"
region             = "us-east-2"
stage              = "production"
availability_zones = ["us-east-2a", "us-east-2b"]
vpc_cidr           = "10.40.0.0/16"
dashboard_host     = "coss.com"
api_host           = "api.coss.com"
portal_host        = "portal.cosshooks.com"
external_origin_hosts = {
  ui     = "coss-com-ui.vercel.app"
  origin = "coss-com-origin.vercel.app"
}
ses_name          = "coss"
github_repository = "cosscom/coss"
# Who may start the deploy runner (people with write access): keithwillcode, PeerRich, pumfleet,
# sean-brydon. Add a new maintainer here before their merges can deploy.
deploy_actor_ids   = ["2538462", "8019099", "25907159", "55134778"]
initial_image_tag  = "2a8195a759b0f11d430f3e9cebfcf535a99dbca7"
log_retention_days = 30

alert_email        = "bailey@coss.com"
monthly_budget_usd = 600

db_instance_class   = "db.t4g.medium"
db_engine_version   = "18.6"
db_password_version = 1

autoscaling = {
  web    = { max = 6, cpu_target = 60 }
  site   = { max = 4, cpu_target = 60 }
  portal = { max = 4, cpu_target = 60 }
  api    = { max = 6, cpu_target = 60 }
  worker = { max = 2, cpu_target = 70 }
}

waf_rate_limits = { dashboard = 5000, api = 20000 }

cloudflare_ipv4_ranges = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
]

plain_env = {
  web = {
    BETTER_AUTH_URL          = "https://coss.com"
    API_PUBLIC_URL           = "https://api.coss.com"
    TRUSTED_PROXY_HOPS       = "2"
    TURNSTILE_SITE_KEY       = "0x4AAAAAAFU8QY0DX4ZJGoSK"
    PORTAL_PUBLIC_URL        = "https://portal.cosshooks.com"
    GOOGLE_CLIENT_ID         = "204721091156-k33omqkstijuaari06eidtlefif81p9m.apps.googleusercontent.com"
    GITHUB_CLIENT_ID         = "Ov23liYEf7MwkA26M9Ul"
    EMAIL_PROVIDER           = "ses"
    AWS_REGION               = "us-east-2"
    SES_CONFIGURATION_SET    = "coss"
    SES_TENANT_PREFIX        = "coss"
    INBOUND_MANAGED_DOMAIN   = "inbound.coss.com"
    SES_INBOUND_BUCKET       = "coss-inbound-294417174674"
    TRACKING_DOMAIN_PROVIDER = "cloudflare"
    CLOUDFLARE_ZONE_ID       = "2e3adbb52b68d57dfa5d71a0b7cfa3cc"
    TRACKING_CNAME_TARGET    = "track.cosslinks.com"
    DATABASE_POOL_MAX        = "10"
    VALKEY_CLUSTER           = "true"
    RATE_LIMIT_KEY_PREFIX    = "coss"
    CLIENT_IP_HEADER         = "x-forwarded-for"
    TRUSTED_PROXY_COUNT      = "2"
    BILLING_PROVIDER         = "stripe"
    # COSS's own organization (`coss`, project `notifications`, live): never suspended by admins.
    NOTIFICATIONS_ENVIRONMENT_ID = "env_01m4s0af5zent8fzxwmtkergw5"
    SENTRY_DSN                   = "https://4ff9a884d5223a8df7cb0a12b373cee5@o4512237982711808.ingest.de.sentry.io/4512245153333328"
    SENTRY_ENVIRONMENT           = "production"
    SENTRY_TRACES_SAMPLE_RATE    = "0.1"
  }
  site = {}
  portal = {
    DATABASE_POOL_MAX     = "5"
    VALKEY_CLUSTER        = "true"
    RATE_LIMIT_KEY_PREFIX = "coss"
    CLIENT_IP_HEADER      = "x-forwarded-for"
    TRUSTED_PROXY_COUNT   = "2"
    SENTRY_ENVIRONMENT    = "production"
  }
  api = {
    BETTER_AUTH_URL           = "https://coss.com"
    API_PUBLIC_URL            = "https://api.coss.com"
    TRACKING_PUBLIC_URL       = "https://track.cosslinks.com"
    PORTAL_PUBLIC_URL         = "https://portal.cosshooks.com"
    API_CORS_ORIGINS          = "https://coss.com"
    EMAIL_PROVIDER            = "ses"
    AWS_REGION                = "us-east-2"
    SES_CONFIGURATION_SET     = "coss"
    SES_TENANT_PREFIX         = "coss"
    INBOUND_MANAGED_DOMAIN    = "inbound.coss.com"
    SES_INBOUND_BUCKET        = "coss-inbound-294417174674"
    TRACKING_DOMAIN_PROVIDER  = "cloudflare"
    CLOUDFLARE_ZONE_ID        = "2e3adbb52b68d57dfa5d71a0b7cfa3cc"
    TRACKING_CNAME_TARGET     = "track.cosslinks.com"
    DATABASE_POOL_MAX         = "10"
    VALKEY_CLUSTER            = "true"
    RATE_LIMIT_KEY_PREFIX     = "coss"
    CLIENT_IP_HEADER          = "x-forwarded-for"
    TRUSTED_PROXY_COUNT       = "2"
    SENTRY_DSN                = "https://32c12dc572c854d73947e15894cd2713@o4512237982711808.ingest.de.sentry.io/4512245153398864"
    SENTRY_ENVIRONMENT        = "production"
    SENTRY_TRACES_SAMPLE_RATE = "0.1"
  }
  worker = {
    BETTER_AUTH_URL       = "https://coss.com"
    API_PUBLIC_URL        = "https://api.coss.com"
    TRACKING_PUBLIC_URL   = "https://track.cosslinks.com"
    EMAIL_PROVIDER        = "ses"
    AWS_REGION            = "us-east-2"
    SES_CONFIGURATION_SET = "coss"
    SES_TENANT_PREFIX     = "coss"
    SES_EVENTS_QUEUE_URL  = "https://sqs.us-east-2.amazonaws.com/294417174674/coss-events"
    # Receiving (ses:bootstrap --managed-domain inbound.coss.com).
    INBOUND_MANAGED_DOMAIN = "inbound.coss.com"
    SES_INBOUND_BUCKET     = "coss-inbound-294417174674"
    SES_INBOUND_QUEUE_URL  = "https://sqs.us-east-2.amazonaws.com/294417174674/coss-inbound"
    # The daily inbound limit per organization is counted in Valkey (VALKEY_URL is in the secret).
    VALKEY_CLUSTER           = "true"
    RATE_LIMIT_KEY_PREFIX    = "coss"
    TRACKING_DOMAIN_PROVIDER = "cloudflare"
    CLOUDFLARE_ZONE_ID       = "2e3adbb52b68d57dfa5d71a0b7cfa3cc"
    TRACKING_CNAME_TARGET    = "track.cosslinks.com"
    DATABASE_POOL_MAX        = "10"
    LOG_RETENTION_DAYS       = "30"
    SCREENING_CLASSIFIER     = "ai"
    SCREENING_MODEL          = "typesafe-ai/jev"
    BILLING_PROVIDER         = "stripe"
    # Account and reputation emails go out through COSS itself, from its own organization.
    NOTIFICATIONS_ENVIRONMENT_ID = "env_01m4s0af5zent8fzxwmtkergw5"
    NOTIFICATIONS_FROM           = "COSS <notifications@coss.com>"
    SENTRY_DSN                   = "https://77c5b5b1c87194a0942714259a44dcac@o4512237982711808.ingest.de.sentry.io/4512245153398865"
    SENTRY_ENVIRONMENT           = "production"
    SENTRY_TRACES_SAMPLE_RATE    = "0.1"
  }
}
