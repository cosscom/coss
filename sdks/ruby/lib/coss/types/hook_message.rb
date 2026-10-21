# frozen_string_literal: true

module Coss
  module Types
    class HookMessage < Internal::Types::Model
      field :object, -> { Coss::Types::HookMessageObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :application_id, -> { String }, optional: false, nullable: false

      field :event_type, -> { String }, optional: false, nullable: false

      field :payload, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
