# frozen_string_literal: true

module Coss
  module Hooks
    module EventTypes
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The environment's event types by name; archived ones only with `include_archived`.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [Coss::Hooks::EventTypes::Types::ListEventTypesRequestIncludeArchived, nil] :include_archived
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.hooks.event_types.list
        #
        # @return [Coss::Types::HookEventTypeList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["include_archived"] = params[:include_archived] if params.key?(:include_archived)
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/event_types",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEventTypeList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Adds a type to the catalog your applications' users subscribe from (in the portal, or the `filter_types` of an
        # endpoint), with a description, a JSON Schema and examples to show them. Messages can be sent with any type,
        # registered or not. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees
        # sandbox ones, a `coss_live_…` key only production ones.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::EventTypes::Types::CreateHookEventTypeRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.hooks.event_types.create(
        #     name: "invoice.paid",
        #     description: "An invoice was paid in full.",
        #     examples: [{
        #       invoice_id: "in_1042",
        #       amount: 4200,
        #       currency: "usd"
        #     }]
        #   )
        #
        # @return [Coss::Types::HookEventType]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/event_types",
            headers: headers,
            body: Coss::Hooks::EventTypes::Types::CreateHookEventTypeRequest.new(params).to_h,
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEventType.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # An event type of the API key's environment, archived or not.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :name
        #
        # @example
        #   client.hooks.event_types.get(name: "invoice.paid")
        #
        # @return [Coss::Types::HookEventType]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/event_types/#{URI.encode_uri_component(params[:name].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEventType.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Hides the type from the portal and from new subscriptions. Endpoints already subscribed keep receiving it.
        # Restore it with `PATCH … { archived: false }`.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :name
        #
        # @example
        #   client.hooks.event_types.archive(name: "invoice.paid")
        #
        # @return [Coss::Types::HookEventType]
        def archive(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/hooks/event_types/#{URI.encode_uri_component(params[:name].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookEventType.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes its description, schema or examples, or archives or restores it.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::EventTypes::Types::UpdateHookEventTypeRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :name
        #
        # @example
        #   client.hooks.event_types.update(
        #     name: "invoice.paid",
        #     archived: false
        #   )
        #
        # @return [Coss::Types::HookEventType]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::EventTypes::Types::UpdateHookEventTypeRequest.new(params).to_h
          non_body_param_names = %w[name]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/hooks/event_types/#{URI.encode_uri_component(params[:name].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookEventType.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
