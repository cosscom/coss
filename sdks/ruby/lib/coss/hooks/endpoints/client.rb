# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The application's endpoints, oldest first. Secrets are never included.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        #
        # @example
        #   client.hooks.endpoints.list(application: "customer_8812")
        #
        # @return [Coss::Types::HookEndpointList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Registers a URL of the application's user that receives its messages, each request signed (Standard Webhooks)
        # with the endpoint's own secret, returned here. Usually your users add endpoints themselves in the portal.
        # Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a
        # `coss_live_…` key only production ones.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Endpoints::Types::CreateHookEndpointRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        #
        # @example
        #   client.hooks.endpoints.create(
        #     application: "customer_8812",
        #     url: "https://example.com/webhooks",
        #     filter_types: ["invoice.paid"]
        #   )
        #
        # @return [Coss::Types::HookEndpointWithSecret]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Endpoints::Types::CreateHookEndpointRequest.new(params).to_h
          non_body_param_names = %w[application]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointWithSecret.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # An endpoint of the application.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.get(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookEndpoint]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpoint.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Deletes the endpoint; its pending deliveries fail. Its delivery log stays.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.delete(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::DeletedHookEndpoint]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedHookEndpoint.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes the URL, description, filter types, rate limit, metadata or `enabled`. Enabling it again clears a
        # failure streak. The secret stays the same (see roll secret).
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Endpoints::Types::UpdateHookEndpointRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.update(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     enabled: false
        #   )
        #
        # @return [Coss::Types::HookEndpoint]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Endpoints::Types::UpdateHookEndpointRequest.new(params).to_h
          non_body_param_names = %w[application endpoint_id]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpoint.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The endpoint's current signing secret, e.g. to show its user. Needs `hook:update`, like rolling it.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.get_secret(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookEndpointSecret]
        def get_secret(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/secret",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointSecret.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Replaces the signing secret, returned here. Until `previous_secret_expires_at`, requests carry a signature
        # with each secret, so the receiver can switch without rejecting any. Not idempotent.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Endpoints::Types::RollHookEndpointSecretRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.roll_secret(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     previous_secret_expires_in: 3600
        #   )
        #
        # @return [Coss::Types::HookEndpointWithSecret]
        def roll_secret(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Endpoints::Types::RollHookEndpointSecretRequest.new(params).to_h
          non_body_param_names = %w[application endpoint_id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/roll_secret",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointWithSecret.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Queues every delivery to the endpoint that failed, of messages sent since `since`, for one more attempt each,
        # e.g. after its receiver was down. coss.com works through them in the background (oldest first); follow
        # `status` with the returned recovery. The endpoint must be enabled.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Endpoints::Types::RecoverHookEndpointRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.recover(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     since: "2026-01-15T00:00:00Z"
        #   )
        #
        # @return [Coss::Types::HookEndpointRecovery]
        def recover(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Endpoints::Types::RecoverHookEndpointRequest.new(params).to_h
          non_body_param_names = %w[application endpoint_id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/recover",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointRecovery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # A recovery of the endpoint: `pending` while deliveries are still being requeued.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        # @option params [String] :recovery_id
        #
        # @example
        #   client.hooks.endpoints.get_recovery(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     recovery_id: "hrec_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookEndpointRecovery]
        def get_recovery(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/recoveries/#{URI.encode_uri_component(params[:recovery_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEndpointRecovery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Sends a message to this endpoint only (whatever its filter), with the given payload or the event type's first
        # example. It counts against the send quota like any message.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Endpoints::Types::SendHookTestRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        #
        # @example
        #   client.hooks.endpoints.send_test(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     event_type: "invoice.paid"
        #   )
        #
        # @return [Coss::Types::HookMessage]
        def send_test(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Endpoints::Types::SendHookTestRequest.new(params).to_h
          non_body_param_names = %w[application endpoint_id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/test",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookMessage.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The endpoint's deliveries, newest first.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :endpoint_id
        # @option params [Coss::Hooks::Endpoints::Types::ListDeliveriesEndpointsRequestStatus, nil] :status
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.hooks.endpoints.list_deliveries(
        #     application: "customer_8812",
        #     endpoint_id: "hep_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookDeliveryList]
        def list_deliveries(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["status"] = params[:status] if params.key?(:status)
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/endpoints/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/deliveries",
            query: query_params,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookDeliveryList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
