# frozen_string_literal: true

module Coss
  module Sign
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # @return [Coss::Documents::Client]
      def documents
        @documents ||= Coss::Sign::Documents::Client.new(client: @client)
      end

      # @return [Coss::Requests::Client]
      def requests
        @requests ||= Coss::Sign::Requests::Client.new(client: @client)
      end

      # @return [Coss::Sessions::Client]
      def sessions
        @sessions ||= Coss::Sign::Sessions::Client.new(client: @client)
      end

      # @return [Coss::Settings::Client]
      def settings
        @settings ||= Coss::Sign::Settings::Client.new(client: @client)
      end

      # @return [Coss::Templates::Client]
      def templates
        @templates ||= Coss::Sign::Templates::Client.new(client: @client)
      end
    end
  end
end
