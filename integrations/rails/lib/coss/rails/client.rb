# frozen_string_literal: true

require "json"
require "net/http"
require "openssl"
require "securerandom"
require "time"
require "uri"

module Coss
  module Rails
    # A small client for `POST /v1/emails`: auth + JSON, a timeout per attempt, retries with
    # backoff (`integrations/README.md`, "Retries"), and every failure raised as a DeliveryError.
    class Client
      DEFAULT_BASE_URL = "https://api.coss.com"
      DEFAULT_TIMEOUT = 30
      DEFAULT_MAX_RETRIES = 2
      API_VERSION = "2026-10-10"
      USER_AGENT = "coss-rails/#{VERSION}".freeze

      INITIAL_RETRY_DELAY_MS = 500
      MAX_RETRY_DELAY_MS = 8_000
      # A server asking us to wait longer than this gets its error returned instead of a stalled send.
      MAX_RETRY_AFTER_MS = 60_000

      TIMEOUT_ERRORS = [Net::OpenTimeout, Net::ReadTimeout, Net::WriteTimeout, Timeout::Error].freeze
      NETWORK_ERRORS = [
        SocketError, SystemCallError, IOError, EOFError, OpenSSL::SSL::SSLError, Net::HTTPBadResponse,
        Net::ProtocolError
      ].freeze

      # The response of one attempt: `status` (Integer), `headers` (lowercase names → values) and
      # `body` (String).
      Response = Struct.new(:status, :headers, :body, keyword_init: true)

      # The default transport: one Net::HTTP connection per attempt.
      class NetHttpTransport
        # Sends one POST and returns a Response. Raises Net::HTTP's own errors (timeouts, network).
        def call(uri:, headers:, body:, timeout:)
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = uri.scheme == "https"
          http.open_timeout = timeout
          http.read_timeout = timeout
          http.write_timeout = timeout
          http.max_retries = 0
          request = Net::HTTP::Post.new(uri.request_uri, headers)
          request.body = body
          response = http.start { |connection| connection.request(request) }
          Response.new(
            status: response.code.to_i,
            headers: response.each_header.to_h { |name, value| [name.downcase, value] },
            body: response.body.to_s
          )
        end
      end

      attr_reader :base_url, :timeout, :max_retries

      # - `api_key`: required.
      # - `base_url`: defaults to `https://api.coss.com` (trailing slashes trimmed).
      # - `timeout`: seconds per attempt (Net::HTTP's open, read and write timeouts), default 30.
      # - `max_retries`: default 2, so at most 3 attempts.
      # - `sleep`: called with the wait before a retry **in seconds** (a Float), like `Kernel#sleep`.
      # - `random`: returns a Float in [0, 1) for the backoff's jitter.
      # - `transport`: responds to `call(uri:, headers:, body:, timeout:)` and returns a Response.
      def initialize(api_key:, base_url: nil, timeout: nil, max_retries: nil, sleep: nil, random: nil, transport: nil)
        @api_key = api_key
        @base_url = (base_url || DEFAULT_BASE_URL).to_s.sub(%r{/+\z}, "")
        @timeout = timeout || DEFAULT_TIMEOUT
        @max_retries = Integer(max_retries || DEFAULT_MAX_RETRIES)
        @sleep = sleep || ->(seconds) { Kernel.sleep(seconds) }
        @random = random || -> { Kernel.rand }
        @transport = transport || NetHttpTransport.new
      end

      # Sends one email (`body`: the request as a Hash) and returns the API's email as a Hash.
      # `idempotency_key` defaults to a random UUID; every attempt reuses it.
      def send_email(body, idempotency_key: nil)
        key = idempotency_key || SecureRandom.uuid
        check_header_value!("Idempotency-Key", key)
        headers = {
          "Authorization" => "Bearer #{@api_key}",
          "Content-Type" => "application/json",
          "Accept" => "application/json",
          "Coss-Version" => API_VERSION,
          "User-Agent" => USER_AGENT,
          "Idempotency-Key" => key
        }
        check_header_value!("Authorization", headers["Authorization"])
        request(URI("#{@base_url}/v1/emails"), headers, JSON.generate(body))
      end

      # Exponential backoff (500 ms, 1 s, 2 s … capped at 8 s) minus up to 25% random jitter, in ms.
      def self.backoff_delay(retry_index, random)
        delay = [INITIAL_RETRY_DELAY_MS * (2**retry_index), MAX_RETRY_DELAY_MS].min
        delay * (1 - (random * 0.25))
      end

      # `Retry-After` in milliseconds: delay-seconds or an HTTP date; `nil` when absent or invalid.
      def self.parse_retry_after(value, now: Time.now)
        trimmed = value.to_s.strip
        return nil if trimmed.empty?

        seconds = Float(trimmed, exception: false)
        return (seconds >= 0 ? seconds * 1000 : nil) if seconds&.finite?

        date = parse_http_date(trimmed)
        date && [0, (date - now) * 1000].max
      end

      def self.parse_http_date(value)
        Time.httpdate(value)
      rescue ArgumentError
        begin
          Time.rfc2822(value)
        rescue ArgumentError
          nil
        end
      end
      private_class_method :parse_http_date

      # 409 (an idempotent request still in progress), 429 and 5xx are transient.
      def self.retryable_status?(status)
        status == 409 || status == 429 || status >= 500
      end

      private

      def request(uri, headers, body)
        retry_index = 0
        loop do
          error, result, retryable, retry_after_ms = attempt(uri, headers, body)
          return result unless error
          raise error if !retryable || retry_index >= @max_retries

          delay = retry_after_ms || self.class.backoff_delay(retry_index, @random.call)
          raise error if delay > MAX_RETRY_AFTER_MS

          @sleep.call(delay / 1000.0)
          retry_index += 1
        end
      end

      # Returns `[error, result, retryable, retry_after_ms]`.
      def attempt(uri, headers, body)
        begin
          response = @transport.call(uri: uri, headers: headers, body: body, timeout: @timeout)
        rescue *TIMEOUT_ERRORS
          return [timeout_error, nil, true, nil]
        rescue *NETWORK_ERRORS => e
          return [network_error(e), nil, true, nil]
        end

        request_id = response.headers["x-request-id"]
        text = Mime.utf8(response.body)
        unless (200..299).cover?(response.status)
          return [
            error_from_response(response.status, text, request_id),
            nil,
            self.class.retryable_status?(response.status),
            self.class.parse_retry_after(response.headers["retry-after"])
          ]
        end

        begin
          [nil, JSON.parse(text), false, nil]
        rescue JSON::ParserError
          error = DeliveryError.new(
            type: "api_error",
            code: "invalid_response",
            message: "The coss.com API returned an HTTP #{response.status} response that is not valid JSON.",
            status: response.status,
            request_id: request_id
          )
          [error, nil, false, nil]
        end
      end

      def error_from_response(status, text, header_request_id)
        envelope = begin
          parsed = JSON.parse(text)
          parsed.is_a?(Hash) ? parsed["error"] : nil
        rescue JSON::ParserError
          nil
        end

        unless envelope.is_a?(Hash) && envelope["message"].is_a?(String)
          return DeliveryError.new(
            type: "api_error",
            code: "unexpected_response",
            message: "The coss.com API returned an unexpected HTTP #{status} response.",
            status: status,
            request_id: header_request_id
          )
        end

        type = envelope["type"]
        DeliveryError.new(
          type: DeliveryError::API_ERROR_TYPES.include?(type) ? type : "api_error",
          code: envelope["code"].is_a?(String) ? envelope["code"] : "unknown_error",
          message: envelope["message"],
          status: status,
          request_id: envelope["request_id"].is_a?(String) ? envelope["request_id"] : header_request_id,
          param: envelope["param"].is_a?(String) ? envelope["param"] : nil,
          issues: parse_issues(envelope["issues"])
        )
      end

      def parse_issues(value)
        return nil unless value.is_a?(Array)

        value.filter_map do |issue|
          next unless issue.is_a?(Hash) && issue["path"].is_a?(String) && issue["message"].is_a?(String)

          { "path" => issue["path"], "message" => issue["message"] }
        end
      end

      def timeout_error
        DeliveryError.new(
          type: "timeout_error",
          code: "request_timeout",
          message: "Request timed out after #{@timeout} seconds."
        )
      end

      def network_error(cause)
        DeliveryError.new(
          type: "connection_error",
          code: "network_error",
          message: "Could not reach the coss.com API at #{@base_url}: #{cause.message} (#{cause.class})"
        )
      end

      # Net::HTTP refuses (or mangles) header values with line breaks or non-ASCII bytes; fail
      # before sending instead of with an error that looks like a network failure.
      def check_header_value!(name, value)
        return if value.is_a?(String) && value.match?(/\A[ -~]*\z/)

        raise DeliveryError.new(
          type: "invalid_request_error",
          code: "invalid_header",
          message: "Invalid request header: #{name} must be printable ASCII."
        )
      end
    end
  end
end
