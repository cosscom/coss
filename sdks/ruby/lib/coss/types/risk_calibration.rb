# frozen_string_literal: true

module Coss
  module Types
    # Feedback against the reasons and rules that fired, over the last 90 days. Feedback you give mostly on reviews and
    # blocks over-represents those: read precision as a guide, not a measurement.
    class RiskCalibration < Internal::Types::Model
      field :object, -> { Coss::Types::RiskCalibrationObject }, optional: false, nullable: false

      field :window_days, -> { Integer }, optional: false, nullable: false

      field :assessments, -> { Integer }, optional: false, nullable: false

      field :labeled, -> { Integer }, optional: false, nullable: false

      field :reasons, -> { Internal::Types::Array[Coss::Types::RiskCalibrationReason] }, optional: false, nullable: false

      field :rules, -> { Internal::Types::Array[Coss::Types::RiskCalibrationRule] }, optional: false, nullable: false
    end
  end
end
