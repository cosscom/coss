# frozen_string_literal: true

module Coss
  module Hooks
    module EventTypes
      module Types
        class CreateHookEventTypeRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :description, -> { String }, optional: true, nullable: false

          field :schema, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false

          field :examples, -> { Internal::Types::Array[Internal::Types::Hash[String, Object]] }, optional: true, nullable: false
        end
      end
    end
  end
end
