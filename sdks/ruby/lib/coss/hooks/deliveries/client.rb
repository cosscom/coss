# frozen_string_literal: true

module Coss
  module Hooks
    module Deliveries
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # One message's delivery to one endpoint.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :delivery_id
        #
        # @example
        #   client.hooks.deliveries.get(
        #     application: "customer_8812",
        #     delivery_id: "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookDelivery]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookDelivery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Every HTTP request of the delivery, oldest first, with response excerpts.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :delivery_id
        #
        # @example
        #   client.hooks.deliveries.list_attempts(
        #     application: "customer_8812",
        #     delivery_id: "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookAttemptList]
        def list_attempts(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}/attempts",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::HookAttemptList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Queues a finished delivery for one more attempt within seconds, to the endpoint's current URL and secret. A
        # `pending` delivery is returned unchanged.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        # @option params [String] :delivery_id
        #
        # @example
        #   client.hooks.deliveries.retry_(
        #     application: "customer_8812",
        #     delivery_id: "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz"
        #   )
        #
        # @return [Coss::Types::HookDelivery]
        def retry_(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}/retry",
            headers: headers,
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookDelivery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
