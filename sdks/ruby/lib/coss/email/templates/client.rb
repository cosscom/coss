# frozen_string_literal: true

module Coss
  module Email
    module Templates
      class Client
        # @param client [Coss::Internal::Http::RawClient]
        #
        # @return [void]
        def initialize(client:)
          @client = client
        end

        # The environment's templates, newest first. Pass the last `id` as `after` to get the next page while `has_more`
        # is true.
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
        #   client.email.templates.list
        #
        # @return [Coss::Types::EmailTemplateList]
        def list(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          query_params = {}
          query_params["limit"] = params[:limit] if params.key?(:limit)
          query_params["after"] = params[:after] if params.key?(:after)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/email_templates",
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
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateList.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Creates a template with a draft holding its variables and a subject, HTML and text per locale. Sends use it
        # once its draft is published. Not idempotent: retrying after a lost response can create a second template
        # (unless it has an `alias`). Templates belong to the API key's own environment: a `coss_test_…` key only ever
        # sees sandbox ones. Give a template the same `alias` in every environment to send it by that name.
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Templates::Types::CreateEmailTemplateRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        #
        # @example
        #   client.email.templates.create(
        #     name: "Welcome",
        #     alias_: "welcome",
        #     default_locale: "en",
        #     variables: [{
        #       name: "first_name",
        #       type: "string",
        #       required: true
        #     }],
        #     sample_variables: {
        #       first_name: "Ada"
        #     },
        #     contents: [{
        #       locale: "en",
        #       subject: "Welcome, {{first_name}}",
        #       html: "<p>Hi {{first_name}}, thanks for signing up!</p>"
        #     }, {
        #       locale: "de",
        #       subject: "Willkommen, {{first_name}}",
        #       html: "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>"
        #     }]
        #   )
        #
        # @return [Coss::Types::EmailTemplate]
        def create(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/email_templates",
            headers: headers,
            body: Coss::Email::Templates::Types::CreateEmailTemplateRequest.new(params).to_h,
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
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplate.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # A template by id or alias. Its content is in its draft and versions.
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
        #   client.email.templates.get(id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::EmailTemplate]
        def get(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplate.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Deletes the template with its draft and every version. Emails already sent or scheduled from it keep their
        # content; new sends naming it fail with `template_not_found`.
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
        #   client.email.templates.delete(id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::DeletedEmailTemplate]
        def delete(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "DELETE",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::DeletedEmailTemplate.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Changes the template's name, alias or description. Changing the alias changes what sends must use. Content
        # changes go to the draft (`PUT /v1/email_templates/{id}/draft`).
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Templates::Types::UpdateEmailTemplateRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.email.templates.update(
        #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     name: "Welcome (new users)"
        #   )
        #
        # @return [Coss::Types::EmailTemplate]
        def update(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Email::Templates::Types::UpdateEmailTemplateRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PATCH",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}",
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
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplate.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # The draft (`version: null`): what the next publish makes sends use. `problems` lists syntax errors and
        # undeclared variables, which keep it from being published.
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
        #   client.email.templates.get_draft(id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
        #
        # @return [Coss::Types::EmailTemplateVersion]
        def get_draft(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "GET",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/draft",
            request_options: request_options
          )
          begin
            response = @client.send(request)
          rescue Net::HTTPRequestTimeout
            raise Coss::Errors::TimeoutError
          end
          code = response.code.to_i
          if code.between?(200, 299)
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersion.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Replaces the draft's variables and content. Sends keep using the published version until the draft is
        # published. Pass the `revision` you read to refuse overwriting someone else's changes. A draft with problems is
        # saved (and reported in `problems`).
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Templates::Types::UpdateEmailTemplateDraftRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.email.templates.update_draft(
        #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     revision: 3,
        #     default_locale: "en",
        #     variables: [{
        #       name: "first_name",
        #       type: "string",
        #       required: true
        #     }],
        #     sample_variables: {
        #       first_name: "Ada"
        #     },
        #     contents: [{
        #       locale: "en",
        #       subject: "Welcome, {{first_name}}",
        #       html: "<p>Hi {{first_name}}, thanks for signing up!</p>"
        #     }, {
        #       locale: "de",
        #       subject: "Willkommen, {{first_name}}",
        #       html: "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>"
        #     }]
        #   )
        #
        # @return [Coss::Types::EmailTemplateVersion]
        def update_draft(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Email::Templates::Types::UpdateEmailTemplateDraftRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "PUT",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/draft",
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
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersion.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Copies the draft into the next version, which sends use from then on. Emails already accepted keep the content
        # they were rendered with. A draft without changes since the last publish returns that version, so retrying with
        # the `revision` you reviewed is safe (without it, a retry could publish edits saved in between).
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Templates::Types::PublishEmailTemplateRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.email.templates.publish(
        #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     revision: 3
        #   )
        #
        # @return [Coss::Types::EmailTemplateVersion]
        def publish(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Email::Templates::Types::PublishEmailTemplateRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/publish",
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
            (response.body.to_s.empty? ? nil : Coss::Types::EmailTemplateVersion.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # Renders the draft (or a published `version`) with `variables`, exactly as a send would, and returns the
        # subject, HTML and text: a preview, nothing is sent or stored. Without `variables` it renders the version's
        # `sample_variables`.
        #
        # @param request_options [Hash]
        # @param params [Coss::Email::Templates::Types::RenderEmailTemplateRequest]
        # @option request_options [String] :base_url
        # @option request_options [Hash{String => Object}] :additional_headers
        # @option request_options [Hash{String => Object}] :additional_query_parameters
        # @option request_options [Hash{String => Object}] :additional_body_parameters
        # @option request_options [Integer] :timeout_in_seconds
        # @option params [String] :id
        #
        # @example
        #   client.email.templates.render(
        #     id: "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        #     locale: "en",
        #     variables: {
        #       first_name: "Ada"
        #     }
        #   )
        #
        # @return [Coss::Types::RenderedEmailTemplate]
        def render(request_options: {}, **params)
          params = Coss::Internal::Types::Utils.normalize_keys(params)
          request_data = Coss::Email::Templates::Types::RenderEmailTemplateRequest.new(params).to_h
          non_body_param_names = %w[id]
          body = request_data.except(*non_body_param_names)

          headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
          request = Coss::Internal::JSON::Request.new(
            base_url: request_options[:base_url],
            method: "POST",
            path: "v1/email_templates/#{URI.encode_uri_component(params[:id].to_s)}/render",
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
            (response.body.to_s.empty? ? nil : Coss::Types::RenderedEmailTemplate.load(response.body))
          else
            error_class = Coss::Errors::ResponseError.subclass_for_code(code)
            raise error_class.new(response.body, code: code)
          end
        end

        # @return [Coss::Versions::Client]
        def versions
          @versions ||= Coss::Email::Templates::Versions::Client.new(client: @client)
        end
      end
    end
  end
end
