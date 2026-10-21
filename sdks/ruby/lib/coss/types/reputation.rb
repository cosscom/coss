# frozen_string_literal: true

module Coss
  module Types
    class Reputation < Internal::Types::Model
      field :object, -> { Coss::Types::ReputationObject }, optional: false, nullable: false

      field :status, -> { Coss::Types::ReputationStatus }, optional: false, nullable: false

      field :reason, -> { String }, optional: false, nullable: true

      field :status_changed_at, -> { String }, optional: false, nullable: true

      field :evaluated_at, -> { String }, optional: false, nullable: true

      field :window, -> { Coss::Types::ReputationWindow }, optional: false, nullable: true

      field :checks, -> { Internal::Types::Array[Coss::Types::ReputationCheck] }, optional: false, nullable: false

      field :marketing, -> { Coss::Types::MarketingStanding }, optional: false, nullable: false
    end
  end
end
