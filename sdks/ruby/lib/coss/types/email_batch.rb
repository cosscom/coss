# frozen_string_literal: true

module Coss
  module Types
    class EmailBatch < Internal::Types::Model
      field :object, -> { Coss::Types::EmailBatchObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Email] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
