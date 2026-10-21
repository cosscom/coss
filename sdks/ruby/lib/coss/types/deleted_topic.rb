# frozen_string_literal: true

module Coss
  module Types
    class DeletedTopic < Internal::Types::Model
      field :object, -> { Coss::Types::DeletedTopicObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
