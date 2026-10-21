# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class TestBroadcastRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

          field :contact, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
