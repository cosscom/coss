# frozen_string_literal: true

module Coss
  module Risk
    module Settings
      module Types
        class UpdateRiskSettingsRequest < Internal::Types::Model
          field :review_threshold, -> { Integer }, optional: true, nullable: false

          field :block_threshold, -> { Integer }, optional: true, nullable: false

          field :disabled_reasons, -> { Internal::Types::Array[Coss::Risk::Settings::Types::UpdateRiskSettingsRequestDisabledReasonsItem] }, optional: true, nullable: false

          field :captcha, -> { Coss::Risk::Settings::Types::UpdateRiskSettingsRequestCaptcha }, optional: true, nullable: false

          field :content_thresholds, -> { Coss::Risk::Settings::Types::UpdateRiskSettingsRequestContentThresholds }, optional: true, nullable: false

          field :reason_weights, -> { Coss::Risk::Settings::Types::UpdateRiskSettingsRequestReasonWeights }, optional: true, nullable: false
        end
      end
    end
  end
end
