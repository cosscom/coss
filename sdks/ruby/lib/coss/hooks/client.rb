# frozen_string_literal: true

module Coss
  module Hooks
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # @return [Coss::EventTypes::Client]
      def event_types
        @event_types ||= Coss::Hooks::EventTypes::Client.new(client: @client)
      end

      # @return [Coss::Applications::Client]
      def applications
        @applications ||= Coss::Hooks::Applications::Client.new(client: @client)
      end

      # @return [Coss::Endpoints::Client]
      def endpoints
        @endpoints ||= Coss::Hooks::Endpoints::Client.new(client: @client)
      end

      # @return [Coss::Messages::Client]
      def messages
        @messages ||= Coss::Hooks::Messages::Client.new(client: @client)
      end

      # @return [Coss::Deliveries::Client]
      def deliveries
        @deliveries ||= Coss::Hooks::Deliveries::Client.new(client: @client)
      end

      # @return [Coss::Portal::Client]
      def portal
        @portal ||= Coss::Hooks::Portal::Client.new(client: @client)
      end
    end
  end
end
