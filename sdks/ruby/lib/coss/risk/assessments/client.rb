# frozen_string_literal: true

module Coss
  module Risk
    module Assessments
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The assessments of the API key's environment, newest first. `review_status=open` is the review queue. Pass the
        # last `id` as `after` to get the next page while `has_more` is true.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [Coss::Types::RiskEvent, nil] :event
        # @option params [Coss::Types::RiskDecision, nil] :decision
        # @option params [String, nil] :user_id
        # @option params [Coss::Risk::Assessments::Types::ListAssessmentsRequestReviewStatus, nil] :review_status
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.risk.assessments.list
        #
        # @return [Coss::Types::RiskAssessmentList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["event"] = params[:event] if params.key?(:event)
          query_params["decision"] = params[:decision] if params.key?(:decision)
          query_params["user_id"] = params[:user_id] if params.key?(:user_id)
          query_params["review_status"] = params[:review_status] if params.key?(:review_status)
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/risk/assessments",
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
            (response.body.to_s.empty? ? nil : Coss::Types::RiskAssessmentList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The email address and IP address are removed 90 days after the assessment; the decision, reasons and signals
        # stay for a year.
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
        #   client.risk.assessments.get(id: "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::RiskAssessment]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/risk/assessments/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::RiskAssessment.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
