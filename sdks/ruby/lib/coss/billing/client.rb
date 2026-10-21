# frozen_string_literal: true

module Coss
  module Billing
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # The organization's plan (and contract), the current billing month's usage and what it would add to the next
      # invoice so far, its standing (`past_due`, billing holds), payment method, and what the plan includes.
      # Organization-wide: every environment's key sees the same. Plan changes are made in the dashboard; subscribe to
      # the `billing.*` webhook events to follow them.
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
      #   client.billing.get
      #
      # @return [Coss::Types::Billing]
      def get(request_options: {}, **_params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/billing",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::Billing.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Billable usage over a range (the current billing month by default), per meter, dimension and bucket (`hour`,
      # `day` or `month`, UTC), oldest first; with `group_by=environment`, per environment too. Only live environments
      # are billed, so only they appear. Usage counts when it becomes billable (an email when the provider accepts it)
      # and is kept for 400 days.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :from
      # @option params [String, nil] :to
      # @option params [Coss::Billing::Types::UsageBillingRequestGranularity, nil] :granularity
      # @option params [Coss::Billing::Types::UsageBillingRequestGroupBy, nil] :group_by
      # @option params [Coss::Billing::Types::UsageBillingRequestMeter, nil] :meter
      #
      # @example
      #   client.billing.usage
      #
      # @return [Coss::Types::UsageList]
      def usage(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["to"] = params[:to] if params.key?(:to)
        query_params["granularity"] = params[:granularity] if params.key?(:granularity)
        query_params["group_by"] = params[:group_by] if params.key?(:group_by)
        query_params["meter"] = params[:meter] if params.key?(:meter)

        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/billing/usage",
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
          (response.body.to_s.empty? ? nil : Coss::Types::UsageList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # @return [Coss::Invoices::Client]
      def invoices
        @invoices ||= Coss::Billing::Invoices::Client.new(client: @client)
      end

      # @return [Coss::Credits::Client]
      def credits
        @credits ||= Coss::Billing::Credits::Client.new(client: @client)
      end
    end
  end
end
