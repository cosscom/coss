# frozen_string_literal: true

module Coss
  module Types
    # Overrides the environment's tracking settings (its default, or the rule for this email's category) for this email.
    # Omitted fields keep the configured setting.
    class TrackingOptions < Internal::Types::Model
      field :opens, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :clicks, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :unsubscribe, -> { Internal::Types::Boolean }, optional: true, nullable: false
    end
  end
end
