# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ImportContactsRequest < Internal::Types::Model
          field :contacts, -> { Internal::Types::Array[Coss::Email::Contacts::Types::ImportContactsRequestContactsItem] }, optional: false, nullable: false

          field :audience_id, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
