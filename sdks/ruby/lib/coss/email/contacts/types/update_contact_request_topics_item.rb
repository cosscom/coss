# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class UpdateContactRequestTopicsItem < Internal::Types::Model
          field :topic, -> { String }, optional: false, nullable: false

          field :status, -> { Coss::Email::Contacts::Types::UpdateContactRequestTopicsItemStatus }, optional: false, nullable: false
        end
      end
    end
  end
end
