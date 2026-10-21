# frozen_string_literal: true

module Coss
  module Types
    class BroadcastTest < Internal::Types::Model
      field :object, -> { Coss::Types::BroadcastTestObject }, optional: false, nullable: false

      field :email_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
