# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ExportContactsRequest < Internal::Types::Model
          field :status, -> { Coss::Email::Contacts::Types::ExportContactsRequestStatus }, optional: true, nullable: false

          field :audience_id, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
