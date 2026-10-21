# frozen_string_literal: true

module Coss
  module Domains
    module Dmarc
      module Reports
        class Client
          # @param client [Coss::Internal::Http::RawClient]
          #
          # @return [void]
          def initialize(client:)
            @client = client
          end

          # The aggregate reports received about the domain, newest first, without their rows (retrieve one for those).
          # Pass the last `id` as `after` to get the next page while `has_more` is true. Mailbox providers send DMARC
          # aggregate reports to the domain's `report_address` once its `_dmarc` record names it (`rua=mailto:…`),
          # usually once a day each.
          #
          # @param request_options [Hash]
          # @param params [Hash]
          # @option request_options [String] :base_url
          # @option request_options [Hash{String => Object}] :additional_headers
          # @option request_options [Hash{String => Object}] :additional_query_parameters
          # @option request_options [Hash{String => Object}] :additional_body_parameters
          # @option request_options [Integer] :timeout_in_seconds
          # @option params [String] :id
          # @option params [Integer, nil] :limit
          # @option params [String, nil] :after
          #
          # @example
          #   client.domains.dmarc.reports.list(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
          #
          # @return [Coss::Types::DmarcReportList]
          def list(request_options: {}, **params)
            params = Coss::Internal::Types::Utils.normalize_keys(params)
            query_params = {}
            query_params["limit"] = params[:limit] if params.key?(:limit)
            query_params["after"] = params[:after] if params.key?(:after)

            request = Coss::Internal::JSON::Request.new(
              base_url: request_options[:base_url],
              method: "GET",
              path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/dmarc/reports",
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
              (response.body.to_s.empty? ? nil : Coss::Types::DmarcReportList.load(response.body))
            else
              error_class = Coss::Errors::ResponseError.subclass_for_code(code)
              raise error_class.new(response.body, code: code)
            end
          end

          # One aggregate report with its rows: each source IP, how many messages it sent, whether they passed DMARC
          # (aligned DKIM or SPF) and what the receiver did with them.
          #
          # @param request_options [Hash]
          # @param params [Hash]
          # @option request_options [String] :base_url
          # @option request_options [Hash{String => Object}] :additional_headers
          # @option request_options [Hash{String => Object}] :additional_query_parameters
          # @option request_options [Hash{String => Object}] :additional_body_parameters
          # @option request_options [Integer] :timeout_in_seconds
          # @option params [String] :id
          # @option params [String] :report_id
          #
          # @example
          #   client.domains.dmarc.reports.get(
          #     id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
          #     report_id: "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz"
          #   )
          #
          # @return [Coss::Types::DmarcReport]
          def get(request_options: {}, **params)
            params = Coss::Internal::Types::Utils.normalize_keys(params)
            request = Coss::Internal::JSON::Request.new(
              base_url: request_options[:base_url],
              method: "GET",
              path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/dmarc/reports/#{URI.encode_uri_component(params[:report_id].to_s)}",
              request_options: request_options
            )
            begin
              response = @client.send(request)
            rescue Net::HTTPRequestTimeout
              raise Coss::Errors::TimeoutError
            end
            code = response.code.to_i
            if code.between?(200, 299)
              (response.body.to_s.empty? ? nil : Coss::Types::DmarcReport.load(response.body))
            else
              error_class = Coss::Errors::ResponseError.subclass_for_code(code)
              raise error_class.new(response.body, code: code)
            end
          end
        end
      end
    end
  end
end
