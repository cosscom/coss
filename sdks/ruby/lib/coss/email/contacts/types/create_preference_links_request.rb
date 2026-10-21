# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class CreatePreferenceLinksRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :topic, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
