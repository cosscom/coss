# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class SendInboxMessageRequestTo < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { String }

          member -> { Internal::Types::Array[String] }
        end
      end
    end
  end
end
