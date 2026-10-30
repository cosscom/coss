# frozen_string_literal: true

module Coss
  module Sign
    module Sessions
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # A short-lived link to the signing page for one `embedded` signer of a sent request. Your app vouches for who
        # the signer is (the audit trail records `customer_asserted`), so create it only for that signed-in user, when
        # they open the page that shows it. Embed the `url` in an iframe from an origin in your Sign settings'
        # `allowed_origins` (`mountSigning` from `coss/sign` does it), or redirect to it. Each call creates a new
        # session.
        #
        # @param request_options [Hash]
        # @param params [Coss::Sign::Sessions::Types::CreateSignSessionRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        # @option params [String] :signer_id
        #
        # @example
        #   client.sign.sessions.create(
        #     id: "sreq_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     signer_id: "ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     expires_in: 3600
        #   )
        #
        # @return [Coss::Types::SignSession]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Sign::Sessions::Types::CreateSignSessionRequest.new(params).to_h
          non_body_param_names = %w[id signer_id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/sign/requests/#{URI.encode_uri_component(params[:id].to_s)}/signers/#{URI.encode_uri_component(params[:signer_id].to_s)}/sessions",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SignSession.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
