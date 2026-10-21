# frozen_string_literal: true

module Coss
  module Types
    class HookEventType < Internal::Types::Model
      field :object, -> { Coss::Types::HookEventTypeObject }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :schema, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: true

      field :examples, -> { Internal::Types::Array[Internal::Types::Hash[String, Object]] }, optional: false, nullable: false

      field :archived, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
