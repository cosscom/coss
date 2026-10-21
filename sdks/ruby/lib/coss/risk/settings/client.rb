# frozen_string_literal: true

module Coss
  module Risk
    module Settings
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The API key's environment's decision thresholds, disabled reasons and captcha provider (never its secret).
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
        #   client.risk.settings.get
        #
        # @return [Coss::Types::RiskSettings]
        def get(request_options: {}, **_params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/risk/settings",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::RiskSettings.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes the fields given. `review_threshold` must not exceed `block_threshold`. Disabled reasons never fire
        # (rules still see the facts behind them). Setting a captcha provider makes assessments verify their
        # `captcha.token` with it; `required` adds `captcha.missing` to assessments without one. `reason_weights`
        # replaces reasons' default weights (for example with calibration's `suggested_weight`); `null` restores a
        # default.
        #
        # @param request_options [Hash]
        # @param params [Coss::Risk::Settings::Types::UpdateRiskSettingsRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.risk.settings.update(
        #     block_threshold: 0.9,
        #     captcha: {
        #       provider: "turnstile",
        #       secret: "0x4AAA…",
        #       required: true
        #     }
        #   )
        #
        # @return [Coss::Types::RiskSettings]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/risk/settings",
            body: Coss::Risk::Settings::Types::UpdateRiskSettingsRequest.new(params).to_h,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::RiskSettings.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
