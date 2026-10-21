# frozen_string_literal: true

module Coss
  module Domains
    module Dmarc
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The domain's published DMARC record, where it is on the path from `p=none` to `p=reject`, the record to
        # publish next and whether the last 14 days of aggregate reports say that is safe (`ready`, with the `checks`
        # behind it), and a summary of those reports. Mailbox providers send DMARC aggregate reports to the domain's
        # `report_address` once its `_dmarc` record names it (`rua=mailto:…`), usually once a day each.
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
        #   client.domains.dmarc.get(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::DomainDmarc]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/dmarc",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DomainDmarc.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # @return [Coss::Reports::Client]
        def reports
          @reports ||= Coss::Domains::Dmarc::Reports::Client.new(client: @client)
        end
      end
    end
  end
end
