# frozen_string_literal: true

module Coss
  module WebhookListeners
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Listeners are how `coss listen` forwards events to a local server: coss.com can't reach `localhost`, so the CLI
      # pulls them. They belong to the API key's environment, receive events created after they open, and don't count
      # toward the plan's webhook endpoints. A listener closes when it is deleted or after 10 minutes without a poll; an
      # environment has at most 5 open at once. Events reach it unsigned: the CLI signs what it forwards with its own
      # secret.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookListeners::Types::CreateWebhookListenerRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.webhook_listeners.create(
      #     event_types: %w[email.sent email.delivered],
      #     description: "localhost:3000/webhooks"
      #   )
      #
      # @return [Coss::Types::WebhookListener]
      def create(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_listeners",
          headers: headers,
          body: Coss::WebhookListeners::Types::CreateWebhookListenerRequest.new(params).to_h,
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
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookListener.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Acknowledges deliveries handed out earlier, keeps the listener open for another 10 minutes, and waits up to
      # `wait_ms` (at most 25 s) for events. Deliveries come oldest first; one not acknowledged within two minutes is
      # handed out again (with the same `event_id`). The answer may come early, with no deliveries, when the API
      # restarts: poll again. Polls are not request-logged; each acknowledgement is logged as a `webhook.forward` line.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookListeners::Types::PollWebhookListenerRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.webhook_listeners.poll(
      #     id: "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
      #     acks: [{
      #       delivery_id: "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
      #       ack_token: "mfz3k2a8",
      #       status_code: 200,
      #       duration_ms: 12,
      #       error: nil
      #     }],
      #     wait_ms: 20000
      #   )
      #
      # @return [Coss::Types::WebhookListenerPoll]
      def poll(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::WebhookListeners::Types::PollWebhookListenerRequest.new(params).to_h
        non_body_param_names = %w[id]
        body = request_data.except(*non_body_param_names)

        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_listeners/#{URI.encode_uri_component(params[:id].to_s)}/poll",
          headers: headers,
          body: body,
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
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookListenerPoll.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Closes the listener: it receives nothing more, and deliveries it was still holding are dropped. `coss listen`
      # closes its listener when it exits.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.webhook_listeners.delete(id: "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::DeletedWebhookListener]
      def delete(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "v1/webhook_listeners/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::DeletedWebhookListener.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end
    end
  end
end
