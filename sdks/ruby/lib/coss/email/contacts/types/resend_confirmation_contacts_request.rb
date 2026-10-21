# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ResendConfirmationContactsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
