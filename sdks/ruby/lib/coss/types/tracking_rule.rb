# frozen_string_literal: true

module Coss
  module Types
    # An environment's tracking default (`category: null`) or the rule for one category. Emails are fixed to the
    # settings that applied when they were sent.
    class TrackingRule < Internal::Types::Model
      field :object, -> { Coss::Types::TrackingRuleObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :category, -> { String }, optional: false, nullable: true

      field :opens, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :clicks, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :unsubscribe, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
