# frozen_string_literal: true

module Coss
  module Types
    class ReputationCheck < Internal::Types::Model
      field :trigger, -> { String }, optional: false, nullable: false

      field :severity, -> { Coss::Types::ReputationCheckSeverity }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false

      field :rate, -> { Integer }, optional: false, nullable: true

      field :count, -> { Integer }, optional: false, nullable: false

      field :volume, -> { Integer }, optional: false, nullable: false

      field :warning_threshold, -> { Integer }, optional: false, nullable: true

      field :suspend_threshold, -> { Integer }, optional: false, nullable: true

      field :minimum_volume, -> { Integer }, optional: false, nullable: true
    end
  end
end
