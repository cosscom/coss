# frozen_string_literal: true

module Coss
  module Hooks
    module Messages
      module Types
        class GetMessagesRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :message_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
