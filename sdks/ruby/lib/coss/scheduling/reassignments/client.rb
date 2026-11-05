# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Who each booking would go to, and why not when nobody can take it, without moving anything. It works down them
        # in order, so two can't both be promised the same free hour. Change any of it and start the run with
        # `assignments`. Covers the first 500. Things can change before you start it: the run decides again.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::Reassignments::Types::PreviewSchedulingReassignmentRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.scheduling.reassignments.preview(
        #     selection: {
        #       host: "doctor_482",
        #       start_before: "2027-08-14T00:00:00.000Z"
        #     },
        #     strategy: {
        #       preferred_hosts: ["doctor_518"]
        #     }
        #   )
        #
        # @return [Coss::Types::SchedulingReassignmentPreview]
        def preview(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/scheduling/reassignments/preview",
            headers: headers,
            body: Coss::Scheduling::Reassignments::Types::PreviewSchedulingReassignmentRequest.new(params).to_h,
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignmentPreview.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Newest first, with how each is going.
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
        #   client.scheduling.reassignments.list
        #
        # @return [Coss::Types::SchedulingReassignmentList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/reassignments",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignmentList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Moves up to 5,000 bookings in the background, each on its own, so one that can't move never holds up the rest.
        # Nothing's ever cancelled: a booking nobody can take stays where it is, and its item says so. It answers at
        # once: follow the run by its id, or wait for `scheduling.reassignment.completed`.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::Reassignments::Types::CreateSchedulingReassignmentRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String, nil] :idempotency_key
        #
        # @example
        #   client.scheduling.reassignments.create(
        #     idempotency_key: "welcome-user-123",
        #     selection: {
        #       out_of_office: "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m"
        #     },
        #     strategy: {
        #       preferred_hosts: ["doctor_518"]
        #     },
        #     reason_code: "out_of_office"
        #   )
        #
        # @return [Coss::Types::SchedulingReassignment]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Scheduling::Reassignments::Types::CreateSchedulingReassignmentRequest.new(params).to_h
          non_body_param_names = %w[Idempotency-Key]
          body = request_data.except(*non_body_param_names)

          headers = {}
          headers["Idempotency-Key"] = params[:idempotency_key] if params[:idempotency_key]

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/scheduling/reassignments",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignment.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # How it's going.
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
        #   client.scheduling.reassignments.get(id: "id")
        #
        # @return [Coss::Types::SchedulingReassignment]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/reassignments/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignment.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Each booking it covers and what happened to it. A group session has one, for one of its seats. Empty until the
        # worker's started on it.
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
        #   client.scheduling.reassignments.items(id: "id")
        #
        # @return [Coss::Types::SchedulingReassignmentItemList]
        def items(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/reassignments/#{URI.encode_uri_component(params[:id].to_s)}/items",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignmentItemList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Stops what hasn't happened yet. What's moved stays moved: undo it for that. Cancelling one that's finished
        # changes nothing.
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
        #   client.scheduling.reassignments.cancel(id: "id")
        #
        # @return [Coss::Types::SchedulingReassignment]
        def cancel(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/scheduling/reassignments/#{URI.encode_uri_component(params[:id].to_s)}/cancel",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignment.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Gives back what a finished run moved, as a new run. A booking that's moved on since stays where it went, and a
        # former host who's no longer free keeps it from going back, unless you pass `overrides`.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.scheduling.reassignments.undo(
        #     id: "id",
        #     reason_code: "other"
        #   )
        #
        # @return [Coss::Types::SchedulingReassignment]
        def undo(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/scheduling/reassignments/#{URI.encode_uri_component(params[:id].to_s)}/undo",
            headers: headers,
            body: body,
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingReassignment.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
