# frozen_string_literal: true

module Coss
  module Types
    class HookAttempt < Internal::Types::Model
      field :object, -> { Coss::Types::HookAttemptObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :delivery_id, -> { String }, optional: false, nullable: false

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :attempted_at, -> { String }, optional: false, nullable: false

      field :status_code, -> { Integer }, optional: false, nullable: true

      field :duration_ms, -> { Integer }, optional: false, nullable: false

      field :error, -> { String }, optional: false, nullable: true

      field :response_excerpt, -> { String }, optional: false, nullable: true
    end
  end
end
