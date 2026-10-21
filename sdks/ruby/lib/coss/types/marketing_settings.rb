# frozen_string_literal: true

module Coss
  module Types
    class MarketingSettings < Internal::Types::Model
      field :object, -> { Coss::Types::MarketingSettingsObject }, optional: false, nullable: false

      field :display_name, -> { String }, optional: false, nullable: true

      field :mailing_address, -> { String }, optional: false, nullable: true

      field :double_opt_in_default, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :confirmation_from, -> { String }, optional: false, nullable: true

      field :confirmation_subject, -> { String }, optional: false, nullable: true

      field :confirmation_html, -> { String }, optional: false, nullable: true

      field :confirmation_text, -> { String }, optional: false, nullable: true

      field :confirmed_redirect_url, -> { String }, optional: false, nullable: true
    end
  end
end
