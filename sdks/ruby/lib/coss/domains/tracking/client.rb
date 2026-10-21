# frozen_string_literal: true

module Coss
  module Domains
    module Tracking
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Sets up a subdomain of the domain (e.g. `links.acme.com`) to serve open and click tracking. Publish the CNAME
        # record in `tracking.record`; coss.com then issues its certificate and checks it in the background, giving up
        # after 72 hours. Open pixels and click redirects of emails sent from the domain (or its subdomains without a
        # domain of their own) use the tracking domain while it is `active`, and the default tracking host otherwise. A
        # domain has at most one tracking domain: remove it to use another hostname.
        #
        # @param request_options [Hash]
        # @param params [Coss::Domains::Tracking::Types::CreateTrackingDomainRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.domains.tracking.create(
        #     id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     hostname: "links.acme.com"
        #   )
        #
        # @return [Coss::Types::Domain]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Domains::Tracking::Types::CreateTrackingDomainRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/tracking",
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

        # Removes the domain's tracking domain. Later emails use the default tracking host, but links and open pixels in
        # emails already sent through the tracking domain stop working.
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
        #   client.domains.tracking.delete(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::Domain]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/tracking",
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
