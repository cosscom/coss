# frozen_string_literal: true

module Coss
  module Types
    class LogDrainBatch < Internal::Types::Model
      field :object, -> { Coss::Types::LogDrainBatchObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :drain_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::LogDrainBatchStatus }, optional: false, nullable: false

      field :line_count, -> { Integer }, optional: false, nullable: false

      field :byte_size, -> { Integer }, optional: false, nullable: false

      field :attempt_count, -> { Integer }, optional: false, nullable: false

      field :next_attempt_at, -> { String }, optional: false, nullable: true

      field :last_status_code, -> { Integer }, optional: false, nullable: true

      field :last_error, -> { String }, optional: false, nullable: true

      field :attempts, -> { Internal::Types::Array[Coss::Types::LogDrainAttempt] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
