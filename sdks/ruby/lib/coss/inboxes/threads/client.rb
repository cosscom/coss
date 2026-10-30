# frozen_string_literal: true

module Coss
  module Inboxes
    module Threads
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The inbox's conversations, the one with the latest message first, with a preview of that message. A thread
        # whose `last_inbound_at` equals its `last_message_at` awaits a reply. Pass the last `id` as `after` to get the
        # next page while `has_more` is true.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [Integer, nil] :limit
        # @option params [String, nil] :after
        #
        # @example
        #   client.inboxes.threads.list(inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::InboxThreadList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/threads",
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
            (response.body.to_s.empty? ? nil : Coss::Types::InboxThreadList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The conversation with its latest messages, oldest first, each with its text and `extracted_text` (its own
        # words, without the quoted conversation): what an agent reads before it replies. HTML is the sender's: sanitize
        # it before showing it to anyone.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String] :thread_id
        #
        # @example
        #   client.inboxes.threads.get(
        #     inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     thread_id: "thread_01k7c8m4r0c2b8w9y3d5f6g7h8"
        #   )
        #
        # @return [Coss::Types::InboxThread]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/threads/#{URI.encode_uri_component(params[:thread_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::InboxThread.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Removes the conversation from the inbox. Its received emails and emails stay in the environment until their
        # retention ends; a later reply starts a new thread.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String] :thread_id
        #
        # @example
        #   client.inboxes.threads.delete(
        #     inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     thread_id: "thread_01k7c8m4r0c2b8w9y3d5f6g7h8"
        #   )
        #
        # @return [Coss::Types::DeletedInboxThread]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/threads/#{URI.encode_uri_component(params[:thread_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedInboxThread.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
