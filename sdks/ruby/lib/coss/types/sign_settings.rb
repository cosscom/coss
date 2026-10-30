# frozen_string_literal: true

module Coss
  module Types
    class SignSettings < Internal::Types::Model
      field :object, -> { Coss::Types::SignSettingsObject }, optional: false, nullable: false

      field :allowed_origins, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :display_name, -> { String }, optional: false, nullable: true

      field :accent_color, -> { String }, optional: false, nullable: true

      field :theme, -> { Coss::Types::SignSettingsTheme }, optional: false, nullable: false

      field :disclosure, -> { String }, optional: false, nullable: true

      field :email_from, -> { String }, optional: false, nullable: true

      field :reminder_interval_days, -> { Integer }, optional: false, nullable: true
    end
  end
end
