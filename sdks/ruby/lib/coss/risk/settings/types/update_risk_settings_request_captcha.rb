# frozen_string_literal: true

module Coss
  module Risk
    module Settings
      module Types
        class UpdateRiskSettingsRequestCaptcha < Internal::Types::Model
          field :provider, -> { Coss::Risk::Settings::Types::UpdateRiskSettingsRequestCaptchaProvider }, optional: false, nullable: false

          field :secret, -> { String }, optional: true, nullable: false

          field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false
        end
      end
    end
  end
end
