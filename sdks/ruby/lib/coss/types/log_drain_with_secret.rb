# frozen_string_literal: true

module Coss
  module Types
    class LogDrainWithSecret < Internal::Types::Model
      field :object, -> { Coss::Types::LogDrainWithSecretObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :sources, -> { Internal::Types::Array[Coss::Types::LogDrainSource] }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :disabled_reason, -> { Coss::Types::LogDrainWithSecretDisabledReason }, optional: false, nullable: true

      field :disabled_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false

      field :secret, -> { String }, optional: false, nullable: false
    end
  end
end
