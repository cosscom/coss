# frozen_string_literal: true

module Coss
  module Domains
    module Receiving
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Starts receiving email at the domain itself or a subdomain (e.g. `inbound.acme.com`): email sent to any
        # address at that hostname becomes a received email of the API key's environment (an `email.received` webhook,
        # `GET /v1/received_emails`). Publish the MX record in `receiving.record`; coss.com checks it in the background.
        # Using the domain itself moves all of its mail to coss.com. A domain has at most one receiving hostname: remove
        # it to use another one.
        #
        # @param request_options [Hash]
        # @param params [Coss::Domains::Receiving::Types::CreateReceivingDomainRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.domains.receiving.create(
        #     id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     hostname: "inbound.acme.com"
        #   )
        #
        # @return [Coss::Types::Domain]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Domains::Receiving::Types::CreateReceivingDomainRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/receiving",
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
            (response.body.to_s.empty? ? nil : Coss::Types::Domain.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Stops receiving at the domain's receiving hostname: later mail to it is dropped (remove the MX record too).
        # Emails already received stay until their retention ends.
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
        #   client.domains.receiving.delete(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::Domain]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/receiving",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::Domain.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
