# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ListContactsRequest < Internal::Types::Model
          field :email, -> { String }, optional: true, nullable: false

          field :status, -> { Coss::Email::Contacts::Types::ListContactsRequestStatus }, optional: true, nullable: false

          field :audience_id, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
