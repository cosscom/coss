# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class ListMessagesRequest < Internal::Types::Model
          field :inbox_id, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false

          field :direction, -> { Coss::Inboxes::Messages::Types::ListMessagesRequestDirection }, optional: true, nullable: false
        end
      end
    end
  end
end
