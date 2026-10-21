# frozen_string_literal: true

module Coss
  module Types
    class ContactTopics < Internal::Types::Model
      field :object, -> { Coss::Types::ContactTopicsObject }, optional: false, nullable: false

      field :contact_id, -> { String }, optional: false, nullable: false

      field :topics, -> { Internal::Types::Array[Coss::Types::ContactTopicsTopicsItem] }, optional: false, nullable: false
    end
  end
end
