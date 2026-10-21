# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        module ExportContactsRequestStatus
          extend Coss::Internal::Types::Enum

          SUBSCRIBED = "subscribed"
          UNSUBSCRIBED = "unsubscribed"
          PENDING = "pending"
        end
      end
    end
  end
end
