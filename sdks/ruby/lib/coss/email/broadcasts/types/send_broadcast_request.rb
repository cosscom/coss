# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class SendBroadcastRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :scheduled_at, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
