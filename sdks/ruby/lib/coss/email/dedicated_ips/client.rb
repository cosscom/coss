# frozen_string_literal: true

module Coss
  module Email
    module DedicatedIps
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The organization's dedicated IP pool (the Dedicated IPs add-on, bought on the dashboard's billing page): its
        # status, its IPs and how much of the last week's mail they delivered. Organization-wide, like domains: every
        # environment's key sees the same pool; only live emails go through it. Without the add-on the status is
        # `not_enabled`.
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
        #   client.email.dedicated_ips.get
        #
        # @return [Coss::Types::DedicatedIPPool]
        def get(request_options: {}, **_params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/dedicated_ips",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DedicatedIPPool.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
