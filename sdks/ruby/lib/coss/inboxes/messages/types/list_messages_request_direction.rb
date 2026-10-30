# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        module ListMessagesRequestDirection
          extend Coss::Internal::Types::Enum

          INBOUND = "inbound"
          OUTBOUND = "outbound"
        end
      end
    end
  end
end
