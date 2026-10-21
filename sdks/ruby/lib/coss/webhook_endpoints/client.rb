# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Every endpoint of the API key's environment, oldest first. Webhook endpoints belong to the API key's own
      # environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones.
      #
      # @param request_options [Hash]
      # @param _params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.webhook_endpoints.list
      #
      # @return [Coss::Types::WebhookEndpointList]
      def list(request_options: {}, **_params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/webhook_endpoints",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpointList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Registers a URL that receives signed event notifications. Webhook endpoints belong to the API key's own
      # environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones.
      # The response carries the signing secret, which is returned only here and when it is rolled: store it, and verify
      # every delivery with it (`verifyWebhook` in the SDK).
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookEndpoints::Types::CreateWebhookEndpointRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.webhook_endpoints.create(
      #     url: "https://example.com/webhooks/coss",
      #     description: "Production receiver",
      #     event_types: %w[email.sent email.delivered]
      #   )
      #
      # @return [Coss::Types::WebhookEndpointWithSecret]
      def create(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_endpoints",
          headers: headers,
          body: Coss::WebhookEndpoints::Types::CreateWebhookEndpointRequest.new(params).to_h,
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
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpointWithSecret.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # The endpoint without its signing secret, which is only returned when created or rolled.
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
      #   client.webhook_endpoints.get(id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::WebhookEndpoint]
      def get(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpoint.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Removes the endpoint and its delivery log. Deliveries already queued for it are dropped. To stop deliveries
      # temporarily, set `enabled` to `false` instead.
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
      #   client.webhook_endpoints.delete(id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::DeletedWebhookEndpoint]
      def delete(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::DeletedWebhookEndpoint.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Changes the URL, description, subscribed event types, API version or `enabled` flag. Omitted fields keep their
      # current value, and the signing secret stays the same (see Roll a signing secret), so receivers keep verifying
      # deliveries. Disabling an endpoint stops deliveries without losing its configuration.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookEndpoints::Types::UpdateWebhookEndpointRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.webhook_endpoints.update(
      #     id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
      #     enabled: false
      #   )
      #
      # @return [Coss::Types::WebhookEndpoint]
      def update(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::WebhookEndpoints::Types::UpdateWebhookEndpointRequest.new(params).to_h
        non_body_param_names = %w[id]
        body = request_data.except(*non_body_param_names)

        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}",
          body: body,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpoint.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Replaces the endpoint's signing secret with a new one, returned in the response (the only time it is). Until
      # `previous_secret_expires_at`, every delivery is signed with both secrets (`webhook-signature` lists two
      # signatures), so receivers verifying with either one accept it: deploy the new secret, then let the old one
      # expire. Rolling again in that time stops the older secret at once. Not idempotent: after a lost response, roll
      # again.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookEndpoints::Types::RollWebhookEndpointSecretRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.webhook_endpoints.roll_secret(
      #     id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
      #     previous_secret_expires_in: 3600
      #   )
      #
      # @return [Coss::Types::WebhookEndpointWithSecret]
      def roll_secret(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::WebhookEndpoints::Types::RollWebhookEndpointSecretRequest.new(params).to_h
        non_body_param_names = %w[id]
        body = request_data.except(*non_body_param_names)

        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}/roll_secret",
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
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpointWithSecret.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Queues the endpoint's deliveries that `failed` since `since` for one more attempt each, oldest first, spread
      # over the next minute, e.g. after fixing a receiver that was down. At most 1000 per call: while `has_more` is
      # `true`, call again with the same `since`. The endpoint must be enabled.
      #
      # @param request_options [Hash]
      # @param params [Coss::WebhookEndpoints::Types::RecoverWebhookEndpointRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.webhook_endpoints.recover(
      #     id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
      #     since: "2026-01-15T09:00:00Z"
      #   )
      #
      # @return [Coss::Types::WebhookEndpointRecovery]
      def recover(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::WebhookEndpoints::Types::RecoverWebhookEndpointRequest.new(params).to_h
        non_body_param_names = %w[id]
        body = request_data.except(*non_body_param_names)

        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}/recover",
          headers: headers,
          body: body,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::WebhookEndpointRecovery.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # @return [Coss::Deliveries::Client]
      def deliveries
        @deliveries ||= Coss::WebhookEndpoints::Deliveries::Client.new(client: @client)
      end
    end
  end
end
