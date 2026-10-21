# frozen_string_literal: true

module Coss
  module Billing
    module Credits
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The organization's credits, newest first: each month's plan credit, prepaid commitments and credits from
        # coss.com support (in dollars, or free units of a product), with what's left. Only usable ones by default
        # (`status=all` for every one). Pass the last `id` as `after` to get the next page while `has_more` is true.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [Coss::Billing::Credits::Types::ListCreditsRequestStatus, nil] :status
        # @option params [String, nil] :after
        # @option params [Integer, nil] :limit
        #
        # @example
        #   client.billing.credits.list
        #
        # @return [Coss::Types::CreditList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["status"] = params[:status] if params.key?(:status)
          query_params["after"] = params[:after] if params.key?(:after)
          query_params["limit"] = params[:limit] if params.key?(:limit)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/billing/credits",
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
            (response.body.to_s.empty? ? nil : Coss::Types::CreditList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
