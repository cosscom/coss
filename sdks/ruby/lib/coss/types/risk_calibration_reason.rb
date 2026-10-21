# frozen_string_literal: true

module Coss
  module Types
    class RiskCalibrationReason < Internal::Types::Model
      field :code, -> { Coss::Types::RiskCalibrationReasonCode }, optional: false, nullable: false

      field :fired, -> { Integer }, optional: false, nullable: false

      field :fraud, -> { Integer }, optional: false, nullable: false

      field :legitimate, -> { Integer }, optional: false, nullable: false

      field :precision, -> { Integer }, optional: false, nullable: true

      field :default_weight, -> { Integer }, optional: false, nullable: false

      field :weight, -> { Integer }, optional: false, nullable: false

      field :suggested_weight, -> { Integer }, optional: false, nullable: true
    end
  end
end
