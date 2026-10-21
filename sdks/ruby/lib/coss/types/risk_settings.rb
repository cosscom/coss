# frozen_string_literal: true

module Coss
  module Types
    class RiskSettings < Internal::Types::Model
      field :object, -> { Coss::Types::RiskSettingsObject }, optional: false, nullable: false

      field :review_threshold, -> { Integer }, optional: false, nullable: false

      field :block_threshold, -> { Integer }, optional: false, nullable: false

      field :disabled_reasons, -> { Internal::Types::Array[Coss::Types::RiskSettingsDisabledReasonsItem] }, optional: false, nullable: false

      field :captcha, -> { Coss::Types::RiskSettingsCaptcha }, optional: false, nullable: true

      field :content_thresholds, -> { Coss::Types::RiskSettingsContentThresholds }, optional: false, nullable: false

      field :reason_weights, -> { Coss::Types::RiskSettingsReasonWeights }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: true
    end
  end
end
