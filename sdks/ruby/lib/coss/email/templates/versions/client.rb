# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Versions
        class Client
          # @param client [Coss::Internal::Http::RawClient]
          #
          # @return [void]
          def initialize(client:)
            @client = client
          end

          # Published versions, newest first. Pass the last `version` as `after` to get the next page while `has_more`
          # is true.
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
          # @option params [Integer, nil] :after
          #
          # @example
          #   client.email.templates.versions.list(id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
          #
          # @return [Coss::Types::EmailTemplateVersionList]
          def list(request_options: {}, **params)
            params = Coss::Internal::Types::Utils.normalize_keys(params)
            query_params = {}
            query_params["limit"] = params[:limit] if params.key?(:limit)
            query_params["after"] = params[:after] if params.key?(:after)

            request = Coss::Internal::JSON::Request.new(
              base_url: request_options[:base_url],
              method: "GET",
              path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/versions",
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
              (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersionList.load(response.body))
            else
              error_class = Coss::Errors::ResponseError.subclass_for_code(code)
              raise error_class.new(response.body, code: code)
            end
          end

          # A published version, which never changes.
          #
          # @param request_options [Hash]
          # @param params [Hash]
          # @option request_options [String] :base_url
          # @option request_options [Hash{String => Object}] :additional_headers
          # @option request_options [Hash{String => Object}] :additional_query_parameters
          # @option request_options [Hash{String => Object}] :additional_body_parameters
          # @option request_options [Integer] :timeout_in_seconds
          # @option params [String] :id
          # @option params [Integer] :version
          #
          # @example
          #   client.email.templates.versions.get(
          #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
          #     version: 1
          #   )
          #
          # @return [Coss::Types::EmailTemplateVersion]
          def get(request_options: {}, **params)
            params = Coss::Internal::Types::Utils.normalize_keys(params)
            request = Coss::Internal::JSON::Request.new(
              base_url: request_options[:base_url],
              method: "GET",
              path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/versions/#{URI.encode_uri_component(params[:version].to_s)}",
              request_options: request_options
            )
            begin
              response = @client.send(request)
            rescue Net::HTTPRequestTimeout
              raise Coss::Errors::TimeoutError
            end
            code = response.code.to_i
            if code.between?(200, 299)
              (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersion.load(response.body))
            else
              error_class = Coss::Errors::ResponseError.subclass_for_code(code)
              raise error_class.new(response.body, code: code)
            end
          end

          # Replaces the draft with a published version's variables and content. Publish the draft to make sends use it
          # again.
          #
          # @param request_options [Hash]
          # @param params [Hash]
          # @option request_options [String] :base_url
          # @option request_options [Hash{String => Object}] :additional_headers
          # @option request_options [Hash{String => Object}] :additional_query_parameters
          # @option request_options [Hash{String => Object}] :additional_body_parameters
          # @option request_options [Integer] :timeout_in_seconds
          # @option params [String] :id
          # @option params [Integer] :version
          #
          # @example
          #   client.email.templates.versions.restore(
          #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
          #     version: 1
          #   )
          #
          # @return [Coss::Types::EmailTemplateVersion]
          def restore(request_options: {}, **params)
            params = Coss::Internal::Types::Utils.normalize_keys(params)
            headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
            request = Coss::Internal::JSON::Request.new(
              base_url: request_options[:base_url],
              method: "POST",
              path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/versions/#{URI.encode_uri_component(params[:version].to_s)}/restore",
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
              (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersion.load(response.body))
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
