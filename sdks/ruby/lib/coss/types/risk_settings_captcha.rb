# frozen_string_literal: true

module Coss
  module Types
    class RiskSettingsCaptcha < Internal::Types::Model
      field :provider, -> { Coss::Types::RiskSettingsCaptchaProvider }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
