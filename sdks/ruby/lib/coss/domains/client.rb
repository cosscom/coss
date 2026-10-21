# frozen_string_literal: true

module Coss
  module Domains
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Every domain of the organization, ordered by name. Domains belong to the organization, not to one environment,
      # so every API key of the organization sees the same domains.
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
      #   client.domains.list
      #
      # @return [Coss::Types::DomainList]
      def list(request_options: {}, **_params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/domains",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::DomainList.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Claims the domain for the organization and returns the DNS records to publish. Domains belong to the
      # organization, not to one environment, so every API key of the organization sees the same domains. The records
      # are checked repeatedly in the background and verification gives up after 72 hours; until the domain is
      # `verified`, live keys cannot send from it.
      #
      # @param request_options [Hash]
      # @param params [Coss::Domains::Types::CreateDomainRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.domains.create(name: "acme.com")
      #
      # @return [Coss::Types::Domain]
      def create(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/domains",
          headers: headers,
          body: Coss::Domains::Types::CreateDomainRequest.new(params).to_h,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::Domain.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # The domain with the result of the last DNS check, so you can show which records are still missing or mismatched.
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
      #   client.domains.get(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::Domain]
      def get(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::Domain.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Removes the domain and its provider identity. Emails already sent are unaffected, but live keys can no longer
      # send from it and the name becomes available again.
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
      #   client.domains.delete(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::DeletedDomain]
      def delete(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Coss::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Coss::Types::DeletedDomain.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # Asks the delivery provider and DNS about the domain immediately instead of waiting for the next background
      # check, and returns the updated domain. A `failed` domain starts verification over with fresh DKIM records, which
      # have to be published again. Its tracking domain, if any, is checked too (and set up again if it `failed`).
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
      #   client.domains.verify(id: "dom_01k7c8m4q2f3e9v6t5r1n0p8yz")
      #
      # @return [Coss::Types::Domain]
      def verify(request_options: {}, **params)
        params = Coss::Internal::Types::Utils.normalize_keys(params)
        headers = { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate }
        request = Coss::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "v1/domains/#{URI.encode_uri_component(params[:id].to_s)}/verify",
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
          (response.body.to_s.empty? ? nil : Coss::Types::Domain.load(response.body))
        else
          error_class = Coss::Errors::ResponseError.subclass_for_code(code)
          raise error_class.new(response.body, code: code)
        end
      end

      # @return [Coss::Tracking::Client]
      def tracking
        @tracking ||= Coss::Domains::Tracking::Client.new(client: @client)
      end

      # @return [Coss::Receiving::Client]
      def receiving
        @receiving ||= Coss::Domains::Receiving::Client.new(client: @client)
      end

      # @return [Coss::Dmarc::Client]
      def dmarc
        @dmarc ||= Coss::Domains::Dmarc::Client.new(client: @client)
      end
    end
  end
end
