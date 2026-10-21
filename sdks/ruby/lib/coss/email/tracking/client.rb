# frozen_string_literal: true

module Coss
  module Email
    module Tracking
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The environment's open and click tracking default and its category rules. For each of `opens` and `clicks`, a
        # send's own `tracking` wins, then the rule for its `category`, then the default, then off. Settings belong to
        # the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the
        # settings that applied when they were sent.
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
        #   client.email.tracking.get
        #
        # @return [Coss::Types::TrackingSettings]
        def get(request_options: {}, **_params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/tracking_settings",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::TrackingSettings.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Removes the environment default: emails without a rule for their category are then not tracked unless the send
        # asks. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox
        # settings. Emails keep the settings that applied when they were sent.
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
        #   client.email.tracking.remove_default
        #
        # @return [Coss::Types::DeletedTrackingRule]
        def remove_default(request_options: {}, **_params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/tracking_settings/default",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedTrackingRule.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Sets the environment default, which applies to emails without a rule for their category. Fields left out keep
        # their value; if there is no default yet, it is created with them off. Settings belong to the API key's own
        # environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied
        # when they were sent.
        #
        # @param request_options [Hash]
        # @param params [Coss::Types::UpdateTrackingRuleRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.email.tracking.update_default(
        #     opens: false,
        #     clicks: false
        #   )
        #
        # @return [Coss::Types::TrackingRule]
        def update_default(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/tracking_settings/default",
            body: Coss::Types::UpdateTrackingRuleRequest.new(params).to_h,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::TrackingRule.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Removes the rule: emails of this category follow the environment default again. Settings belong to the API
        # key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that
        # applied when they were sent.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :category
        #
        # @example
        #   client.email.tracking.remove_category(category: "password-reset")
        #
        # @return [Coss::Types::DeletedTrackingRule]
        def remove_category(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/tracking_settings/categories/#{URI.encode_uri_component(params[:category].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedTrackingRule.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Sets the rule for emails sent with this `category`, which wins over the environment default, e.g. to track
        # `marketing` but never `password-reset`. Fields left out keep their value; a new rule is created with them off.
        # Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings.
        # Emails keep the settings that applied when they were sent.
        #
        # @param request_options [Hash]
        # @param params [Coss::Types::UpdateTrackingRuleRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :category
        #
        # @example
        #   client.email.tracking.update_category(
        #     category: "password-reset",
        #     opens: false,
        #     clicks: false
        #   )
        #
        # @return [Coss::Types::TrackingRule]
        def update_category(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          path_param_names = %i[category]
          body_params = params.except(*path_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/tracking_settings/categories/#{URI.encode_uri_component(params[:category].to_s)}",
            body: Coss::Types::UpdateTrackingRuleRequest.new(body_params).to_h,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::TrackingRule.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
