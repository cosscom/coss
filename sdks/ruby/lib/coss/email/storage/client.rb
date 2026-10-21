# frozen_string_literal: true

module Coss
  module Email
    module Storage
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Whether coss.com keeps the content of the environment's emails (`content_storage: "store"`, the default) or
        # only until each email is sent, fails or is canceled (`"discard"`). Settings belong to the API key's own
        # environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the setting that applied when
        # they were sent.
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
        #   client.email.storage.get
        #
        # @return [Coss::Types::StorageSettings]
        def get(request_options: {}, **_params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/storage_settings",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::StorageSettings.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # With `content_storage: "discard"`, emails sent from now on keep their subject, body, headers, template
        # variables and attachment filenames only until they are sent, fail or are canceled (scheduled emails keep them
        # until their time comes); request logs never keep them. Their metadata (addresses, tags, category, status,
        # recipients, events) is kept as usual. Settings belong to the API key's own environment: a `coss_test_…` key
        # only ever changes sandbox settings. Emails keep the setting that applied when they were sent.
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Storage::Types::UpdateStorageSettingsRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.email.storage.update(content_storage: "discard")
        #
        # @return [Coss::Types::StorageSettings]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/storage_settings",
            body: Coss::Email::Storage::Types::UpdateStorageSettingsRequest.new(params).to_h,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::StorageSettings.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
