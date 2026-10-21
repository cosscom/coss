# frozen_string_literal: true

module Coss
  module Types
    class MarketingStanding < Internal::Types::Model
      field :status, -> { Coss::Types::MarketingStandingStatus }, optional: false, nullable: false

      field :reason, -> { String }, optional: false, nullable: true

      field :paused_at, -> { String }, optional: false, nullable: true
    end
  end
end
