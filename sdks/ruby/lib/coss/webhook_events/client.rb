# frozen_string_literal: true

module Coss
  module WebhookEvents
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Sends a sample event of a type to the environment's enabled endpoints subscribed to it and its open listeners
      # (`coss listen`), exactly as a real one is sent: same body, signature, retries and log lines. `coss trigger`
      # calls it. Sandbox environments only. The ids in the sample are made up (pass real ones in `data` for a handler
      # that looks them up), and nothing marks the event as a test: your handler takes it like the real thing. When
      # nothing is subscribed, the event goes nowhere and isn't kept.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookEvents::Types::CreateTestWebhookEventRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.webhook_events.test(
      #     type: "email.bounced",
      #     data: {
      #       recipient: "ada@example.com"
      #     }
      #   )
      #
      # @return [Coss::Types::WebhookTestEvent]
      def test(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_events/test",
          headers: headers,
          body: Coss::WebhookEvents::Types::CreateTestWebhookEventRequest.new(params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookTestEvent.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end
    end
  end
end
