# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ImportContactsRequestContactsItem < Internal::Types::Model
          field :email, -> { String }, optional: false, nullable: false

          field :first_name, -> { String }, optional: true, nullable: false

          field :last_name, -> { String }, optional: true, nullable: false

          field :properties, -> { Internal::Types::Hash[String, Coss::Email::Contacts::Types::ImportContactsRequestContactsItemPropertiesValue] }, optional: true, nullable: false

          field :status, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
