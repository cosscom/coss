# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The environment's entries, newest first.
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
        # @option params [String, nil] :host
        # @option params [String, nil] :start_after
        # @option params [String, nil] :start_before
        # @option params [String, nil] :group
        #
        # @example
        #   client.scheduling.out_of_office.list(
        #     start_after: "2027-01-04T15:00:00.000Z",
        #     start_before: "2027-01-04T15:00:00.000Z"
        #   )
        #
        # @return [Coss::Types::SchedulingOutOfOfficeList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)
          query_params["host"] = params[:host] if params.key?(:host)
          query_params["start_after"] = params[:start_after] if params.key?(:start_after)
          query_params["start_before"] = params[:start_before] if params.key?(:start_before)
          query_params["group"] = params[:group] if params.key?(:group)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/out_of_office",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOfficeList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Marks one host, a list of hosts or everyone matching some attributes as away, for part of a day or for whole
        # dates. They aren't offered during it. Existing bookings stay as they are: list them with the entry's
        # conflicts.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::OutOfOffice::Types::CreateSchedulingOutOfOfficeRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.scheduling.out_of_office.create(
        #     host: "doctor_482",
        #     start_date: "2027-08-02",
        #     end_date: "2027-08-13",
        #     reason: "vacation",
        #     public_message: "Back on the 16th."
        #   )
        #
        # @return [Coss::Types::SchedulingOutOfOfficeList]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/scheduling/out_of_office",
            headers: headers,
            body: Coss::Scheduling::OutOfOffice::Types::CreateSchedulingOutOfOfficeRequest.new(params).to_h,
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOfficeList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # One entry.
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
        #   client.scheduling.out_of_office.get(id: "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m")
        #
        # @return [Coss::Types::SchedulingOutOfOffice]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/out_of_office/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOffice.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The host can be booked in that time again, and any calendar event for it goes.
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
        #   client.scheduling.out_of_office.remove(id: "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m")
        #
        # @return [Coss::Types::DeletedSchedulingOutOfOffice]
        def remove(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/scheduling/out_of_office/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedSchedulingOutOfOffice.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes what's given. An entry stays with its host.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::OutOfOffice::Types::UpdateSchedulingOutOfOfficeRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.scheduling.out_of_office.update(
        #     id: "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m",
        #     end_date: "2027-08-20"
        #   )
        #
        # @return [Coss::Types::SchedulingOutOfOffice]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Scheduling::OutOfOffice::Types::UpdateSchedulingOutOfOfficeRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/scheduling/out_of_office/#{URI.encode_uri_component(params[:id].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOffice.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # For syncing from a system of record such as an HR tool: send what it says, as often as you like, and there's
        # one entry for it. Give every field you want to keep.
        #
        # @param request_options [Hash]
        # @param params [Coss::Scheduling::OutOfOffice::Types::PutSchedulingOutOfOfficeRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :external_id
        #
        # @example
        #   client.scheduling.out_of_office.put(
        #     external_id: "hr_leave_4471",
        #     host: "doctor_482",
        #     start_date: "2027-08-02",
        #     end_date: "2027-08-13",
        #     reason: "vacation"
        #   )
        #
        # @return [Coss::Types::SchedulingOutOfOffice]
        def put(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Scheduling::OutOfOffice::Types::PutSchedulingOutOfOfficeRequest.new(params).to_h
          non_body_param_names = %w[external_id]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PUT",
            path: "v1/scheduling/out_of_office/by_external_id/#{URI.encode_uri_component(params[:external_id].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOffice.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Live bookings of the host that fall in the entry, soonest first. Entries never change them.
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
        #
        # @example
        #   client.scheduling.out_of_office.conflicts(id: "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m")
        #
        # @return [Coss::Types::SchedulingOutOfOfficeConflictList]
        def conflicts(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/scheduling/out_of_office/#{URI.encode_uri_component(params[:id].to_s)}/conflicts",
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
            (response.body.to_s.empty? ? nil : Coss::Types::SchedulingOutOfOfficeConflictList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
