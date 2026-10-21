# frozen_string_literal: true

module Coss
  module Email
    module MarketingSettings
      module Types
        class UpdateMarketingSettingsRequest < Internal::Types::Model
          field :display_name, -> { String }, optional: true, nullable: false

          field :mailing_address, -> { String }, optional: true, nullable: false

          field :double_opt_in_default, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :confirmation_from, -> { String }, optional: true, nullable: false

          field :confirmation_subject, -> { String }, optional: true, nullable: false

          field :confirmation_html, -> { String }, optional: true, nullable: false

          field :confirmation_text, -> { String }, optional: true, nullable: false

          field :confirmed_redirect_url, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
