# frozen_string_literal: true

# Hand-written (listed in .fernignore): verifies coss.com webhook and log drain requests (Standard
# Webhooks signatures), like the TypeScript SDK's verifyWebhook and verifyLogDrainBatch.

require "json"
require "openssl"

module Coss
  # A webhook request failed verification: reject it (e.g. respond 400).
  class WebhookVerificationError < StandardError; end

  module Webhooks
    SECRET_PREFIX = "whsec_"
    DEFAULT_TOLERANCE_SECONDS = 300

    module_function

    # Checks the request's signature and age, then returns the parsed event (a Hash). Pass the raw
    # request body exactly as received (not re-serialized JSON), the request headers (a Hash, a
    # Rack env or Rails' request.headers; names compare case-insensitively) and the endpoint's
    # whsec_… signing secret. Raises
    # Coss::WebhookVerificationError when the request must be rejected. The same check verifies
    # messages your own users receive from coss.com Hooks: pass that endpoint's secret.
    def verify(payload, headers, secret, tolerance: DEFAULT_TOLERANCE_SECONDS, now: Time.now)
      text = verify_signature(payload, headers, secret, tolerance, now)
      JSON.parse(text)
    rescue JSON::ParserError
      raise WebhookVerificationError, "The webhook body is not valid JSON."
    end

    # Checks a log drain request's signature and age, then returns its lines (the body is NDJSON:
    # one log line or audit event per line). The webhook-id header is the batch id, the same on
    # every retry of a batch: use it (or each line's id) to skip a batch you already stored.
    def verify_log_drain_batch(payload, headers, secret, tolerance: DEFAULT_TOLERANCE_SECONDS, now: Time.now)
      text = verify_signature(payload, headers, secret, tolerance, now)
      text.split("\n").reject(&:empty?).map { |line| JSON.parse(line) }
    rescue JSON::ParserError
      raise WebhookVerificationError, "The log drain body is not valid NDJSON."
    end

    def verify_signature(payload, headers, secret, tolerance, now)
      text = payload.to_s.dup.force_encoding(Encoding::UTF_8)
      id = header(headers, "webhook-id")
      timestamp = header(headers, "webhook-timestamp")
      signatures = header(headers, "webhook-signature")
      raise WebhookVerificationError, "Missing webhook-id, webhook-timestamp or webhook-signature." if blank?(id) || blank?(timestamp) || blank?(signatures)
      raise WebhookVerificationError, "The webhook timestamp is too old or in the future." if !timestamp.match?(/\A[0-9]+\z/) || (now.to_i - timestamp.to_i).abs > tolerance

      key = decode_base64(secret.delete_prefix(SECRET_PREFIX))
      raise WebhookVerificationError, "The signing secret is not a valid whsec_… secret." if key.nil? || key.empty?

      expected = OpenSSL::HMAC.digest("SHA256", key, "#{id}.#{timestamp}.#{text}")
      # Several space-separated signatures are sent while a secret is being rotated.
      signatures.split.each do |candidate|
        version, value = candidate.split(",", 2)
        next unless version == "v1" && !blank?(value)

        signature = decode_base64(value)
        return text if signature && signature.bytesize == expected.bytesize && OpenSSL.fixed_length_secure_compare(signature, expected)
      end
      raise WebhookVerificationError, "No webhook signature matches."
    end

    def header(headers, name)
      return single(headers[name]) unless headers.is_a?(Hash)

      headers.each do |key, value|
        # Rack env names (HTTP_WEBHOOK_ID) count too.
        next unless key.to_s.downcase.delete_prefix("http_").tr("_", "-") == name

        return single(value)
      end
      nil
    end

    def single(value)
      value = value.first if value.is_a?(Array)
      value.is_a?(String) ? value : nil
    end

    def decode_base64(value)
      value.unpack1("m0")
    rescue ArgumentError
      nil
    end

    def blank?(value)
      value.nil? || value.empty?
    end

    private_class_method :verify_signature, :header, :single, :decode_base64, :blank?
  end
end
