# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Deliveries
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The endpoint's delivery log, newest first: one delivery per event sent to it, with every HTTP attempt and the
        # payload as sent. Pass the last `id` as `after` to get the next page while `has_more` is true. Deleting the
        # endpoint deletes its log.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        # @option params [Coss::WebhookEndpoints::Deliveries::Types::ListDeliveriesRequestStatus, nil] :status
        # @option params [String, nil] :event_id
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.webhook_endpoints.deliveries.list(id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::WebhookDeliveryList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["status"] = params[:status] if params.key?(:status)
          query_params["event_id"] = params[:event_id] if params.key?(:event_id)
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}/deliveries",
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
            (response.body.to_s.empty? ? nil : Coss::Types::WebhookDeliveryList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # One delivery of the endpoint, with every HTTP attempt and the payload as sent.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        # @option params [String] :delivery_id
        #
        # @example
        #   client.webhook_endpoints.deliveries.get(
        #     id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     delivery_id: "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv"
        #   )
        #
        # @return [Coss::Types::WebhookDelivery]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::WebhookDelivery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Queues a finished delivery (`succeeded` or `failed`) for one more attempt, made within seconds, signed with
        # the endpoint's current secret and sent to its current URL. A delivery that is still `pending` is returned
        # unchanged: it is already scheduled for `next_attempt_at` (automatic retries stop after 8 attempts).
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        # @option params [String] :delivery_id
        #
        # @example
        #   client.webhook_endpoints.deliveries.retry_(
        #     id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     delivery_id: "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv"
        #   )
        #
        # @return [Coss::Types::WebhookDelivery]
        def retry_(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/webhook_endpoints/#{URI.encode_uri_component(params[:id].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}/retry",
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
            (response.body.to_s.empty? ? nil : Coss::Types::WebhookDelivery.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
