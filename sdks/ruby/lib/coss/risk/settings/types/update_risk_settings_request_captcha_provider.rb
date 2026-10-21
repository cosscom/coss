# frozen_string_literal: true

module Coss
  module Risk
    module Settings
      module Types
        module UpdateRiskSettingsRequestCaptchaProvider
          extend Coss::Internal::Types::Enum

          TURNSTILE = "turnstile"
          HCAPTCHA = "hcaptcha"
        end
      end
    end
  end
end
