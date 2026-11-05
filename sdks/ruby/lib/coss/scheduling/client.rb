# frozen_string_literal: true

module Coss
  module Scheduling
    class Client
      # @param client [Coss::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # @return [Coss::Hosts::Client]
      def hosts
        @hosts ||= Coss::Scheduling::Hosts::Client.new(client: @client)
      end

      # @return [Coss::Bookings::Client]
      def bookings
        @bookings ||= Coss::Scheduling::Bookings::Client.new(client: @client)
      end

      # @return [Coss::Reassignments::Client]
      def reassignments
        @reassignments ||= Coss::Scheduling::Reassignments::Client.new(client: @client)
      end

      # @return [Coss::HolidayCalendars::Client]
      def holiday_calendars
        @holiday_calendars ||= Coss::Scheduling::HolidayCalendars::Client.new(client: @client)
      end

      # @return [Coss::OutOfOffice::Client]
      def out_of_office
        @out_of_office ||= Coss::Scheduling::OutOfOffice::Client.new(client: @client)
      end

      # @return [Coss::Schedules::Client]
      def schedules
        @schedules ||= Coss::Scheduling::Schedules::Client.new(client: @client)
      end

      # @return [Coss::EventTypes::Client]
      def event_types
        @event_types ||= Coss::Scheduling::EventTypes::Client.new(client: @client)
      end

      # @return [Coss::Slots::Client]
      def slots
        @slots ||= Coss::Scheduling::Slots::Client.new(client: @client)
      end

      # @return [Coss::Availability::Client]
      def availability
        @availability ||= Coss::Scheduling::Availability::Client.new(client: @client)
      end

      # @return [Coss::Holds::Client]
      def holds
        @holds ||= Coss::Scheduling::Holds::Client.new(client: @client)
      end

      # @return [Coss::Series::Client]
      def series
        @series ||= Coss::Scheduling::Series::Client.new(client: @client)
      end

      # @return [Coss::Attendees::Client]
      def attendees
        @attendees ||= Coss::Scheduling::Attendees::Client.new(client: @client)
      end

      # @return [Coss::Calendars::Client]
      def calendars
        @calendars ||= Coss::Scheduling::Calendars::Client.new(client: @client)
      end

      # @return [Coss::CalendarDelegations::Client]
      def calendar_delegations
        @calendar_delegations ||= Coss::Scheduling::CalendarDelegations::Client.new(client: @client)
      end

      # @return [Coss::OauthApps::Client]
      def oauth_apps
        @oauth_apps ||= Coss::Scheduling::OauthApps::Client.new(client: @client)
      end

      # @return [Coss::Sessions::Client]
      def sessions
        @sessions ||= Coss::Scheduling::Sessions::Client.new(client: @client)
      end

      # @return [Coss::Settings::Client]
      def settings
        @settings ||= Coss::Scheduling::Settings::Client.new(client: @client)
      end
    end
  end
end
