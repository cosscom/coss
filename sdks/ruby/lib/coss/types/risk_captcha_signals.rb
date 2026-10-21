# frozen_string_literal: true

module Coss
  module Types
    class RiskCaptchaSignals < Internal::Types::Model
      field :provided, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :passed, -> { Internal::Types::Boolean }, optional: false, nullable: true
    end
  end
end
