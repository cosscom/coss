# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class UpsertContactRequestTopicsItem < Internal::Types::Model
          field :topic, -> { String }, optional: false, nullable: false

          field :status, -> { Coss::Email::Contacts::Types::UpsertContactRequestTopicsItemStatus }, optional: false, nullable: false
        end
      end
    end
  end
end
