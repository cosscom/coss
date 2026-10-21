# frozen_string_literal: true

module Coss
  module Types
    class RiskCalibrationRule < Internal::Types::Model
      field :rule, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :matched, -> { Integer }, optional: false, nullable: false

      field :fraud, -> { Integer }, optional: false, nullable: false

      field :legitimate, -> { Integer }, optional: false, nullable: false

      field :precision, -> { Integer }, optional: false, nullable: true
    end
  end
end
