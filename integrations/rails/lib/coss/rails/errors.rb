# frozen_string_literal: true

module Coss
  module Rails
    # The base of every error this gem raises: `rescue Coss::Rails::Error` catches them all.
    class Error < StandardError; end

    # The delivery method isn't configured (no API key).
    class ConfigurationError < Error; end

    # The message uses something coss.com can't send (a `Sender` header, a separate envelope, a
    # header given twice, an alternative part other than one HTML part …). Raised before any request.
    class UnsupportedMessageError < Error; end

    # coss.com refused the email, or couldn't be reached.
    class DeliveryError < Error
      # The API's error types; anything else a response says becomes `api_error`.
      API_ERROR_TYPES = %w[
        invalid_request_error authentication_error permission_error not_found_error
        idempotency_error rate_limit_error billing_error api_error
      ].freeze

      # `invalid_request_error`, `authentication_error`, … or, without a response,
      # `connection_error` / `timeout_error`.
      attr_reader :type
      # Machine-readable reason, e.g. `domain_not_verified`.
      attr_reader :code
      # The HTTP status, `nil` when there was no response (network error, timeout).
      attr_reader :status
      # The API's request id (`req_…`) to quote to support, `nil` when unknown.
      attr_reader :request_id
      # The request parameter the error is about, when the API names one.
      attr_reader :param
      # Validation issues, `[{ "path" => "to", "message" => "…" }]`, when the API gives them.
      attr_reader :issues
      # The API's own message (without this gem's prefix).
      attr_reader :error_message

      def initialize(type:, code:, message:, status: nil, request_id: nil, param: nil, issues: nil)
        @type = type
        @code = code
        @error_message = message
        @status = status
        @request_id = request_id
        @param = param
        @issues = issues
        details = issues&.map { |issue| "#{issue['path']}: #{issue['message']}" }&.join("; ")
        text = "coss.com could not send the email: #{message} (#{code})"
        text += " #{details}" if details && !details.empty?
        super(text)
      end

      # The error as the API's envelope fields (`param` and `issues` only when present).
      def to_h
        hash = { "type" => type, "code" => code, "message" => error_message, "status" => status,
                 "request_id" => request_id }
        hash["param"] = param unless param.nil?
        hash["issues"] = issues unless issues.nil?
        hash
      end
    end
  end
end
