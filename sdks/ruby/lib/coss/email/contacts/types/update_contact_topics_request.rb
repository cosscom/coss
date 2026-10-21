# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class UpdateContactTopicsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :topics, -> { Internal::Types::Array[Coss::Email::Contacts::Types::UpdateContactTopicsRequestTopicsItem] }, optional: false, nullable: false
        end
      end
    end
  end
end
