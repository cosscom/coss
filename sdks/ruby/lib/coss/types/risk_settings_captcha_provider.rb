# frozen_string_literal: true

module Coss
  module Types
    module RiskSettingsCaptchaProvider
      extend Coss::Internal::Types::Enum

      TURNSTILE = "turnstile"
      HCAPTCHA = "hcaptcha"
    end
  end
end
