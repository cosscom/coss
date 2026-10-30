# frozen_string_literal: true

module Coss
  module Sign
    module Settings
      module Types
        class UpdateSignSettingsRequest < Internal::Types::Model
          field :allowed_origins, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :display_name, -> { String }, optional: true, nullable: false

          field :accent_color, -> { String }, optional: true, nullable: false

          field :theme, -> { Coss::Sign::Settings::Types::UpdateSignSettingsRequestTheme }, optional: true, nullable: false

          field :disclosure, -> { String }, optional: true, nullable: false

          field :email_from, -> { String }, optional: true, nullable: false

          field :reminder_interval_days, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
