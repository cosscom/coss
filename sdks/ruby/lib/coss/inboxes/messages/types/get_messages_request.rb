# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class GetMessagesRequest < Internal::Types::Model
          field :inbox_id, -> { String }, optional: false, nullable: false

          field :message_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
