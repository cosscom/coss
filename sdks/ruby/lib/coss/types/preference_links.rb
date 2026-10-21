# frozen_string_literal: true

module Coss
  module Types
    class PreferenceLinks < Internal::Types::Model
      field :object, -> { Coss::Types::PreferenceLinksObject }, optional: false, nullable: false

      field :contact_id, -> { String }, optional: false, nullable: false

      field :preferences_url, -> { String }, optional: false, nullable: false

      field :unsubscribe_url, -> { String }, optional: false, nullable: false
    end
  end
end
