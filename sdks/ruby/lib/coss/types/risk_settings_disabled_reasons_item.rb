# frozen_string_literal: true

module Coss
  module Types
    module RiskSettingsDisabledReasonsItem
      extend Coss::Internal::Types::Enum

      EMAIL_INVALID = "email.invalid"
      EMAIL_DISPOSABLE = "email.disposable"
      EMAIL_UNDELIVERABLE = "email.undeliverable"
      EMAIL_ROLE_ACCOUNT = "email.role_account"
      EMAIL_TYPO = "email.typo"
      EMAIL_DOMAIN_NEW = "email.domain_new"
      IP_TOR = "ip.tor"
      IP_VPN_NETWORK = "ip.vpn_network"
      IP_HOSTING_PROVIDER = "ip.hosting_provider"
      IP_VPN = "ip.vpn"
      IP_PROXY = "ip.proxy"
      IP_RELAY = "ip.relay"
      IP_PRIVATE = "ip.private"
      VELOCITY_SIGNUPS_PER_IP1H = "velocity.signups_per_ip_1h"
      VELOCITY_SIGNUPS_PER_IP24H = "velocity.signups_per_ip_24h"
      VELOCITY_SIGNUPS_PER_SUBNET1H = "velocity.signups_per_subnet_1h"
      VELOCITY_SIGNUPS_PER_EMAIL_DOMAIN1H = "velocity.signups_per_email_domain_1h"
      VELOCITY_SIGNUPS_PER_MAILBOX24H = "velocity.signups_per_mailbox_24h"
      VELOCITY_SIGNUPS_PER_DEVICE24H = "velocity.signups_per_device_24h"
      VELOCITY_CHECKOUTS_PER_IP1H = "velocity.checkouts_per_ip_1h"
      VELOCITY_CHECKOUTS_PER_USER1H = "velocity.checkouts_per_user_1h"
      VELOCITY_CHECKOUTS_PER_CARD24H = "velocity.checkouts_per_card_24h"
      VELOCITY_LOGINS_PER_IP1H = "velocity.logins_per_ip_1h"
      VELOCITY_LOGINS_PER_USER1H = "velocity.logins_per_user_1h"
      VELOCITY_EVENTS_PER_IP1H = "velocity.events_per_ip_1h"
      VELOCITY_EVENTS_PER_USER1H = "velocity.events_per_user_1h"
      DUPLICATE_CANONICAL_MAILBOX = "duplicate.canonical_mailbox"
      DUPLICATE_DEVICE = "duplicate.device"
      HISTORY_FRAUD_MAILBOX = "history.fraud_mailbox"
      HISTORY_FRAUD_USER = "history.fraud_user"
      HISTORY_FRAUD_IP = "history.fraud_ip"
      HISTORY_FRAUD_SUBNET = "history.fraud_subnet"
      HISTORY_FRAUD_CARD = "history.fraud_card"
      HISTORY_FRAUD_DEVICE = "history.fraud_device"
      CHECKOUT_CARD_COUNTRY_MISMATCH = "checkout.card_country_mismatch"
      CHECKOUT_BILLING_COUNTRY_MISMATCH = "checkout.billing_country_mismatch"
      CHECKOUT_PREPAID_CARD = "checkout.prepaid_card"
      DEVICE_AUTOMATION = "device.automation"
      DEVICE_INVALID = "device.invalid"
      LOGIN_NEW_COUNTRY = "login.new_country"
      LOGIN_NEW_NETWORK = "login.new_network"
      CAPTCHA_FAILED = "captcha.failed"
      CAPTCHA_MISSING = "captcha.missing"
    end
  end
end
