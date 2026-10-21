# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class UpdateContactRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :first_name, -> { String }, optional: true, nullable: false

          field :last_name, -> { String }, optional: true, nullable: false

          field :properties, -> { Internal::Types::Hash[String, Coss::Email::Contacts::Types::UpdateContactRequestPropertiesValue] }, optional: true, nullable: false

          field :status, -> { Coss::Email::Contacts::Types::UpdateContactRequestStatus }, optional: true, nullable: false

          field :topics, -> { Internal::Types::Array[Coss::Email::Contacts::Types::UpdateContactRequestTopicsItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
