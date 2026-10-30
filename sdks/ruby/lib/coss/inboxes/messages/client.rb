# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # Messages of every thread, newest first, with a preview instead of their bodies (retrieve one for those). Pass
        # the last `id` as `after` to get the next page while `has_more` is true.
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
        # @option params [Coss::Inboxes::Messages::Types::ListMessagesRequestDirection, nil] :direction
        #
        # @example
        #   client.inboxes.messages.list(inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::InboxMessageList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)
          query_params["direction"] = params[:direction] if params.key?(:direction)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/messages",
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
            (response.body.to_s.empty? ? nil : Coss::Types::InboxMessageList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Starts a thread with a message from the inbox's address, sent like any email (its `email_id` has its delivery
        # events and webhooks; never tracked). Replies to it arrive in the same thread. Live inboxes send only from
        # receiving domains under one of the organization's verified domains (`can_send`); sandbox ones always can, and
        # deliver nothing. Recipients count against the send quota.
        #
        # @param request_options [Hash]
        # @param params [Coss::Inboxes::Messages::Types::SendInboxMessageRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String, nil] :idempotency_key
        #
        # @example
        #   client.inboxes.messages.send_(
        #     inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     idempotency_key: "welcome-user-123",
        #     to: "jane@example.com",
        #     subject: "Your order",
        #     text: "Hi Jane, your order has shipped."
        #   )
        #
        # @return [Coss::Types::InboxMessage]
        def send_(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Inboxes::Messages::Types::SendInboxMessageRequest.new(params).to_h
          non_body_param_names = %w[inbox_id Idempotency-Key]
          body = request_data.except(*non_body_param_names)

          headers = {}
          headers["Idempotency-Key"] = params[:idempotency_key] if params[:idempotency_key]

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/messages",
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
            (response.body.to_s.empty? ? nil : Coss::Types::InboxMessage.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The message with its text, HTML and `extracted_text`. An outbound message's delivery is its email's
        # (`email_id`).
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String] :message_id
        #
        # @example
        #   client.inboxes.messages.get(
        #     inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     message_id: "imsg_01k7c8m4s1d3c9x0z4e6g7h8j9"
        #   )
        #
        # @return [Coss::Types::InboxMessage]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/messages/#{URI.encode_uri_component(params[:message_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::InboxMessage.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # An inbound message's attachment, always as `application/octet-stream` (its declared type is the attachment's
        # `content_type`): treat it as untrusted.
        #
        # @param request_options [Hash]
        # @param params [Hash]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String] :message_id
        # @option params [String] :attachment_id
        #
        # @example
        #   client.inboxes.messages.get_attachment(
        #     inbox_id: "inbox_id",
        #     message_id: "message_id",
        #     attachment_id: "attachment_id"
        #   )
        #
        # @return [untyped]
        def get_attachment(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/messages/#{URI.encode_uri_component(params[:message_id].to_s)}/attachments/#{URI.encode_uri_component(params[:attachment_id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          return response.body if code.between?(200, 299)

          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end

        # Replies in the message's thread from the inbox's address: to its sender (its `Reply-To` first), or to an
        # outbound message's recipients again for a follow-up; `reply_all` adds everyone else on it. The subject gets
        # `Re:`, and `In-Reply-To`/`References` let the recipient's mail client thread it. Sent like any email, counted
        # against the send quota.
        #
        # @param request_options [Hash]
        # @param params [Coss::Inboxes::Messages::Types::ReplyInboxMessageRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :inbox_id
        # @option params [String] :message_id
        # @option params [String, nil] :idempotency_key
        #
        # @example
        #   client.inboxes.messages.reply(
        #     inbox_id: "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     message_id: "imsg_01k7c8m4s1d3c9x0z4e6g7h8j9",
        #     idempotency_key: "welcome-user-123",
        #     text: "Sorry about that, Jane! A new one is on its way."
        #   )
        #
        # @return [Coss::Types::InboxMessage]
        def reply(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Inboxes::Messages::Types::ReplyInboxMessageRequest.new(params).to_h
          non_body_param_names = %w[inbox_id message_id Idempotency-Key]
          body = request_data.except(*non_body_param_names)

          headers = {}
          headers["Idempotency-Key"] = params[:idempotency_key] if params[:idempotency_key]

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/inboxes/#{URI.encode_uri_component(params[:inbox_id].to_s)}/messages/#{URI.encode_uri_component(params[:message_id].to_s)}/reply",
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
            (response.body.to_s.empty? ? nil : Coss::Types::InboxMessage.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end
      end
    end
  end
end
