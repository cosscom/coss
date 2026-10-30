# frozen_string_literal: true

module Coss
  module Email
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Emails sent from the API key's environment, newest first, without their content (retrieve an email for `html`,
      # `text`, `headers` and `attachments`). Filter by recipient (`to`), by the email's or a recipient's status, by
      # category, batch or creation time. Pass the last `id` as `after` to get the next page while `has_more` is true.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :to
      # @option params [String, nil] :recipient_status
      # @option params [String, nil] :status
      # @option params [String, nil] :q
      # @option params [String, nil] :category
      # @option params [String, nil] :batch_id
      # @option params [String, nil] :subaccount
      # @option params [String, nil] :created_after
      # @option params [String, nil] :created_before
      # @option params [Integer, nil] :limit
      # @option params [String, nil] :after
      #
      # @example
      #   client.email.list(to: "user@example.com")
      #
      # @return [Coss::Types::EmailSummaryList]
      def list(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["to"] = params[:to] if params.key?(:to)
        query_params["recipient_status"] = params[:recipient_status] if params.key?(:recipient_status)
        query_params["status"] = params[:status] if params.key?(:status)
        query_params["q"] = params[:q] if params.key?(:q)
        query_params["category"] = params[:category] if params.key?(:category)
        query_params["batch_id"] = params[:batch_id] if params.key?(:batch_id)
        query_params["subaccount"] = params[:subaccount] if params.key?(:subaccount)
        query_params["created_after"] = params[:created_after] if params.key?(:created_after)
        query_params["created_before"] = params[:created_before] if params.key?(:created_before)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["after"] = params[:after] if params.key?(:after)

        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/emails",
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
          (response.body.to_s.empty? ? nil : Coss::Types::EmailSummaryList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Queues an email from the API key's environment and returns it with `status: "queued"`; it is handed to the
      # delivery provider moments later. Follow it with `GET /v1/emails/{id}` or the `email.sent` / `email.failed`
      # webhooks. Live (`coss_live_…`) keys must send from a verified domain of the organization. Sandbox
      # (`coss_test_…`) keys accept any `from` and never deliver anything; the response has `sandbox: true`. Recipients
      # on the environment's suppression list (for every email, or for the email's `category`) are skipped and get the
      # status `suppressed`. With a future `scheduled_at` the email is stored with the status `scheduled` and sent at
      # that time; the domain and the suppression list are checked again then. Attachments are base64-encoded; only
      # metadata is kept after sending. Recipients count against the organization's send quota (per second and per day;
      # sandbox environments have their own daily quota). With open or click tracking on (the environment's settings, or
      # `tracking`), the HTML body is delivered with a tracking pixel and/or links rewritten to coss.com redirects; the
      # stored `html` stays as sent.
      #
      # @param request_options [Hash]
      # @param params [Coss::Types::SendEmailRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.email.send_(
      #     idempotency_key: "welcome-user-123",
      #     from: "Acme <onboarding@acme.com>",
      #     to: "user@example.com",
      #     subject: "Welcome to Acme",
      #     html: "<p>Thanks for signing up!</p>",
      #     tags: [{
      #       name: "template",
      #       value: "welcome"
      #     }],
      #     category: "onboarding"
      #   )
      #
      # @return [Coss::Types::Email]
      def send_(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = {}
        headers["Idempotency-Key"] = params[:idempotency_key] if params[:idempotency_key]
        params = params.except(:idempotency_key)

        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/emails",
          headers: headers,
          body: Coss::Types::SendEmailRequest.new(params).to_h,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::Email.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Queues up to 100 emails in one request. Each email is handled exactly as by `POST /v1/emails` (sender checks,
      # suppressions, scheduling, attachments, tracking), but the batch is all or nothing: if any email is invalid, or
      # any `from` is not a verified domain (live keys), nothing is stored and the error names the email (e.g.
      # `emails.3.to`). One `Idempotency-Key` covers the whole batch. The emails' recipients are charged against the
      # send quota together, so a batch with more recipients than the quota allows at once is refused (`quota_exceeded`
      # without `Retry-After`): split it. The request body shares the 40 MB limit of a single send.
      #
      # @param request_options [Hash]
      # @param params [Coss::Email::Types::SendEmailBatchRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.email.send_batch(
      #     idempotency_key: "welcome-user-123",
      #     emails: [{
      #       from: "Acme <notifications@acme.com>",
      #       to: "ada@example.com",
      #       subject: "Your weekly summary",
      #       html: "<p>Hi Ada, here is your week.</p>",
      #       category: "digest"
      #     }, {
      #       from: "Acme <notifications@acme.com>",
      #       to: "grace@example.com",
      #       subject: "Your weekly summary",
      #       html: "<p>Hi Grace, here is your week.</p>",
      #       category: "digest"
      #     }]
      #   )
      #
      # @return [Coss::Types::EmailBatch]
      def send_batch(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::Email::Types::SendEmailBatchRequest.new(params).to_h
        non_body_param_names = %w[Idempotency-Key]
        body = request_data.except(*non_body_param_names)

        headers = {}
        headers["Idempotency-Key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/emails/batch",
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
          (response.body.to_s.empty? ? nil : Coss::Types::EmailBatch.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # A batch sent with `POST /v1/emails/batch`, with its emails' current statuses in the order of the request. Emails
      # past the data retention period are left out. Only batches sent from the API key's own environment can be
      # retrieved.
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
      #   client.email.get_batch(id: "batch_01k8d0n6x5f3w2e1r9t7y4u6i8")
      #
      # @return [Coss::Types::EmailBatch]
      def get_batch(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/emails/batch/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::EmailBatch.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Only emails sent from the API key's own environment can be retrieved.
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
      #   client.email.get(id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::Email]
      def get(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/emails/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::Email.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Cancels an email sent with a future `scheduled_at` before it is sent. Canceling an already canceled email
      # returns it unchanged. To send it at another time, reschedule it instead.
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
      #   client.email.cancel(id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::Email]
      def cancel(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/emails/#{URI.encode_uri_component(params[:id].to_s)}/cancel",
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
          (response.body.to_s.empty? ? nil : Coss::Types::Email.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Moves an email sent with a future `scheduled_at` to a new time, at most 30 days from now, and records an
      # `email.rescheduled` event. A time that is not in the future sends it within seconds. Rescheduling to the time it
      # already has returns it unchanged. The domain and the suppression list are still checked when it is sent.
      #
      # @param request_options [Hash]
      # @param params [Coss::Email::Types::RescheduleEmailRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :id
      #
      # @example
      #   client.email.reschedule(
      #     id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
      #     scheduled_at: "2026-10-12T09:00:00Z"
      #   )
      #
      # @return [Coss::Types::Email]
      def reschedule(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request_data = Coss::Email::Types::RescheduleEmailRequest.new(params).to_h
        non_body_param_names = %w[id]
        body = request_data.except(*non_body_param_names)

        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/emails/#{URI.encode_uri_component(params[:id].to_s)}/reschedule",
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
          (response.body.to_s.empty? ? nil : Coss::Types::Email.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Every delivery event of the email, oldest first: `email.scheduled`, `email.rescheduled`, `email.canceled`,
      # `email.sent` and `email.failed` for the whole email, and `email.delivered`, `email.delivery_delayed`,
      # `email.bounced`, `email.complained` and `email.suppressed` (skipped because of the suppression list) per
      # recipient, plus `email.opened` and `email.clicked` when tracking is on (attributed to a recipient only when the
      # email had a single one) and `email.unsubscribed` after a one-click unsubscribe.
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
      #   client.email.list_events(id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::EmailEventList]
      def list_events(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/emails/#{URI.encode_uri_component(params[:id].to_s)}/events",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::EmailEventList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # The links coss.com rewrote for click tracking, in the order they appear in the HTML, with their click counts.
      # Empty unless the email was sent with click tracking.
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
      #   client.email.list_links(id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::EmailLinkList]
      def list_links(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/emails/#{URI.encode_uri_component(params[:id].to_s)}/links",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::EmailLinkList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # @return [Coss::Templates::Client]
      def templates
        @templates ||= Coss::Email::Templates::Client.new(client: @client)
      end

      # @return [Coss::DedicatedIps::Client]
      def dedicated_ips
        @dedicated_ips ||= Coss::Email::DedicatedIps::Client.new(client: @client)
      end

      # @return [Coss::Suppressions::Client]
      def suppressions
        @suppressions ||= Coss::Email::Suppressions::Client.new(client: @client)
      end

      # @return [Coss::Subaccounts::Client]
      def subaccounts
        @subaccounts ||= Coss::Email::Subaccounts::Client.new(client: @client)
      end

      # @return [Coss::Tracking::Client]
      def tracking
        @tracking ||= Coss::Email::Tracking::Client.new(client: @client)
      end

      # @return [Coss::Storage::Client]
      def storage
        @storage ||= Coss::Email::Storage::Client.new(client: @client)
      end

      # @return [Coss::Contacts::Client]
      def contacts
        @contacts ||= Coss::Email::Contacts::Client.new(client: @client)
      end

      # @return [Coss::Broadcasts::Client]
      def broadcasts
        @broadcasts ||= Coss::Email::Broadcasts::Client.new(client: @client)
      end

      # @return [Coss::Audiences::Client]
      def audiences
        @audiences ||= Coss::Email::Audiences::Client.new(client: @client)
      end

      # @return [Coss::Segments::Client]
      def segments
        @segments ||= Coss::Email::Segments::Client.new(client: @client)
      end

      # @return [Coss::Topics::Client]
      def topics
        @topics ||= Coss::Email::Topics::Client.new(client: @client)
      end

      # @return [Coss::MarketingSettings::Client]
      def marketing_settings
        @marketing_settings ||= Coss::Email::MarketingSettings::Client.new(client: @client)
      end

      # @return [Coss::Received::Client]
      def received
        @received ||= Coss::Email::Received::Client.new(client: @client)
      end
    end
  end
end
