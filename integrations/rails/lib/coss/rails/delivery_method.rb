# frozen_string_literal: true

module Coss
  module Rails
    # The `:coss` Action Mailer delivery method (also usable with Mail directly:
    # `mail.delivery_method Coss::Rails::DeliveryMethod, api_key: "…"`).
    #
    # Settings (`config.action_mailer.coss_settings`):
    #
    # - `api_key`: defaults to `ENV["COSS_API_KEY"]`; a missing key fails the delivery, not the boot.
    # - `base_url`: defaults to `https://api.coss.com`.
    # - `timeout`: seconds per attempt, default 30.
    # - `max_retries`: default 2.
    # - `return_response`: when true, `deliver_now!` / `Mail::Message#deliver!` return the email Hash.
    #
    # `sleep`, `random` and `transport` are passed to Client (for tests).
    class DeliveryMethod
      CLIENT_SETTINGS = %i[base_url timeout max_retries sleep random transport].freeze

      attr_accessor :settings

      def initialize(settings = {})
        @settings = (settings || {}).to_h.transform_keys(&:to_sym)
      end

      # Sends `mail` and returns the email as the API returned it (a Hash), also stored as
      # `mail.coss_email`. Raises UnsupportedMessageError, ConfigurationError or DeliveryError.
      def deliver!(mail)
        body, idempotency_key = MessageMapper.new(mail).to_request
        email = client.send_email(body, idempotency_key: idempotency_key)
        mail.coss_email = email
        email
      end

      private

      def client
        options = settings.slice(*CLIENT_SETTINGS)
        base_url = ENV.fetch("COSS_BASE_URL", nil)
        options[:base_url] = base_url if options[:base_url].to_s.empty? && !base_url.to_s.empty?
        Client.new(api_key: api_key, **options)
      end

      def api_key
        key = settings[:api_key]
        key = ENV.fetch("COSS_API_KEY", nil) if key.nil? || key.to_s.empty?
        return key unless key.nil? || key.empty?

        raise ConfigurationError,
              "No coss.com API key: set config.action_mailer.coss_settings[:api_key] " \
              "(coss_settings[:api_key]) or the COSS_API_KEY environment variable."
      end
    end
  end
end
