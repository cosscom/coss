# frozen_string_literal: true

module Coss
  module Types
    # Reasons whose weight this environment changed (from calibration or by hand); the rest weigh what the reason
    # catalog says.
    class RiskSettingsReasonWeights < Internal::Types::Model
      field :email_invalid, -> { Integer }, optional: true, nullable: false, api_name: "email.invalid"

      field :email_disposable, -> { Integer }, optional: true, nullable: false, api_name: "email.disposable"

      field :email_undeliverable, -> { Integer }, optional: true, nullable: false, api_name: "email.undeliverable"

      field :email_role_account, -> { Integer }, optional: true, nullable: false, api_name: "email.role_account"

      field :email_typo, -> { Integer }, optional: true, nullable: false, api_name: "email.typo"

      field :email_domain_new, -> { Integer }, optional: true, nullable: false, api_name: "email.domain_new"

      field :ip_tor, -> { Integer }, optional: true, nullable: false, api_name: "ip.tor"

      field :ip_vpn_network, -> { Integer }, optional: true, nullable: false, api_name: "ip.vpn_network"

      field :ip_hosting_provider, -> { Integer }, optional: true, nullable: false, api_name: "ip.hosting_provider"

      field :ip_vpn, -> { Integer }, optional: true, nullable: false, api_name: "ip.vpn"

      field :ip_proxy, -> { Integer }, optional: true, nullable: false, api_name: "ip.proxy"

      field :ip_relay, -> { Integer }, optional: true, nullable: false, api_name: "ip.relay"

      field :ip_private, -> { Integer }, optional: true, nullable: false, api_name: "ip.private"

      field :velocity_signups_per_ip1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_ip_1h"

      field :velocity_signups_per_ip24h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_ip_24h"

      field :velocity_signups_per_subnet1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_subnet_1h"

      field :velocity_signups_per_email_domain1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_email_domain_1h"

      field :velocity_signups_per_mailbox24h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_mailbox_24h"

      field :velocity_signups_per_device24h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.signups_per_device_24h"

      field :velocity_checkouts_per_ip1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.checkouts_per_ip_1h"

      field :velocity_checkouts_per_user1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.checkouts_per_user_1h"

      field :velocity_checkouts_per_card24h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.checkouts_per_card_24h"

      field :velocity_logins_per_ip1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.logins_per_ip_1h"

      field :velocity_logins_per_user1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.logins_per_user_1h"

      field :velocity_events_per_ip1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.events_per_ip_1h"

      field :velocity_events_per_user1h, -> { Integer }, optional: true, nullable: false, api_name: "velocity.events_per_user_1h"

      field :duplicate_canonical_mailbox, -> { Integer }, optional: true, nullable: false, api_name: "duplicate.canonical_mailbox"

      field :duplicate_device, -> { Integer }, optional: true, nullable: false, api_name: "duplicate.device"

      field :history_fraud_mailbox, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_mailbox"

      field :history_fraud_user, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_user"

      field :history_fraud_ip, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_ip"

      field :history_fraud_subnet, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_subnet"

      field :history_fraud_card, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_card"

      field :history_fraud_device, -> { Integer }, optional: true, nullable: false, api_name: "history.fraud_device"

      field :checkout_card_country_mismatch, -> { Integer }, optional: true, nullable: false, api_name: "checkout.card_country_mismatch"

      field :checkout_billing_country_mismatch, -> { Integer }, optional: true, nullable: false, api_name: "checkout.billing_country_mismatch"

      field :checkout_prepaid_card, -> { Integer }, optional: true, nullable: false, api_name: "checkout.prepaid_card"

      field :device_automation, -> { Integer }, optional: true, nullable: false, api_name: "device.automation"

      field :device_invalid, -> { Integer }, optional: true, nullable: false, api_name: "device.invalid"

      field :login_new_country, -> { Integer }, optional: true, nullable: false, api_name: "login.new_country"

      field :login_new_network, -> { Integer }, optional: true, nullable: false, api_name: "login.new_network"

      field :captcha_failed, -> { Integer }, optional: true, nullable: false, api_name: "captcha.failed"

      field :captcha_missing, -> { Integer }, optional: true, nullable: false, api_name: "captcha.missing"

      field :content_spam, -> { Integer }, optional: true, nullable: false, api_name: "content.spam"

      field :content_phishing, -> { Integer }, optional: true, nullable: false, api_name: "content.phishing"

      field :content_malware, -> { Integer }, optional: true, nullable: false, api_name: "content.malware"

      field :content_fraud, -> { Integer }, optional: true, nullable: false, api_name: "content.fraud"
    end
  end
end
