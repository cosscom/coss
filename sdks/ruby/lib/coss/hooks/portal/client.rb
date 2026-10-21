# frozen_string_literal: true

module Coss
  module Hooks
    module Portal
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Signs the application's user in to the portal, where they add endpoints, pick event types, see deliveries and
        # retry them, without you building any UI. Create one each time the user opens it (from your backend: never
        # expose the API key) and open or embed the returned `url`; embedding needs the site's origin in the
        # environment's portal settings.
        #
        # @param request_options [Hash]
        # @param params [Coss::Hooks::Portal::Types::CreateHookPortalSessionRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :application
        #
        # @example
        #   client.hooks.portal.create_session(
        #     application: "customer_8812",
        #     expires_in: 3600
        #   )
        #
        # @return [Coss::Types::HookPortalSession]
        def create_session(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Hooks::Portal::Types::CreateHookPortalSessionRequest.new(params).to_h
          non_body_param_names = %w[application]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/hooks/applications/#{URI.encode_uri_component(params[:application].to_s)}/portal_sessions",
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
            (response.body.to_s.empty? ? nil : Coss::Types::HookPortalSession.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
