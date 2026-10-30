# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The environment's sub-accounts, newest first. Sub-accounts belong to the API key's own environment: a
        # `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.email.subaccounts.list(after: "sub_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::SubaccountList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/subaccounts",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SubaccountList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Creates a sub-account: one of your users, who gets their own domains, suppressions, quotas and reputation.
        # Give it a `uid` (e.g. your user's id) to address it by in every path and send. Sub-accounts belong to the API
        # key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production
        # ones.
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Subaccounts::Types::CreateSubaccountRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.email.subaccounts.create(
        #     name: "Acme Bakery",
        #     uid: "user_8812",
        #     quotas: {
        #       recipients_per_day: 5000
        #     }
        #   )
        #
        # @return [Coss::Types::Subaccount]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/subaccounts",
            headers: headers,
            body: Coss::Email::Subaccounts::Types::CreateSubaccountRequest.new(params).to_h,
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
            (response.body.to_s.empty? ? nil : Coss::Types::Subaccount.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # A sub-account of the API key's environment, by its id or uid, with its quotas and reputation.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :subaccount
        #
        # @example
        #   client.email.subaccounts.get(subaccount: "user_8812")
        #
        # @return [Coss::Types::Subaccount]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/subaccounts/#{URI.encode_uri_component(params[:subaccount].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::Subaccount.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Starts deleting the sub-account: its sends are refused at once, then its domains are released and it is
        # removed with its suppressions (`status` is `deleting` until then). Its emails stay, with its id. Repeating the
        # call returns it as it is.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :subaccount
        #
        # @example
        #   client.email.subaccounts.delete(subaccount: "user_8812")
        #
        # @return [Coss::Types::Subaccount]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/subaccounts/#{URI.encode_uri_component(params[:subaccount].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::Subaccount.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes the name, uid, metadata, status or quotas. Fields left out keep their value; `status: "disabled"`
        # refuses its sends until it is `active` again.
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Subaccounts::Types::UpdateSubaccountRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :subaccount
        #
        # @example
        #   client.email.subaccounts.update(
        #     subaccount: "user_8812",
        #     status: "disabled"
        #   )
        #
        # @return [Coss::Types::Subaccount]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Email::Subaccounts::Types::UpdateSubaccountRequest.new(params).to_h
          non_body_param_names = %w[subaccount]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/subaccounts/#{URI.encode_uri_component(params[:subaccount].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::Subaccount.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Lifts the sub-account's reputation pause (or warning) once you fixed what caused it: its rates are measured
        # again from now on. A pause is never lifted on its own. Repeating the call returns it as it is. Your
        # organization's own reputation still counts its sending.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :subaccount
        #
        # @example
        #   client.email.subaccounts.reinstate(subaccount: "user_8812")
        #
        # @return [Coss::Types::Subaccount]
        def reinstate(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/subaccounts/#{URI.encode_uri_component(params[:subaccount].to_s)}/reinstate",
            headers: headers,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::Subaccount.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The sub-account's sending per UTC day: recipients, sent, delivered, bounced, complained, failed and
        # suppressed, counted from its emails as they are now (a later bounce moves its day's numbers). Emails are kept
        # 45 days, so earlier days are left out.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :subaccount
        # @option params [String, nil] :from
        # @option params [String, nil] :to
        #
        # @example
        #   client.email.subaccounts.stats(
        #     subaccount: "user_8812",
        #     from: "2026-10-01",
        #     to: "2026-10-15"
        #   )
        #
        # @return [Coss::Types::SubaccountStats]
        def stats(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["from"] = params[:from] if params.key?(:from)
          query_params["to"] = params[:to] if params.key?(:to)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/subaccounts/#{URI.encode_uri_component(params[:subaccount].to_s)}/stats",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SubaccountStats.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
