# frozen_string_literal: true

module Coss
  module LogDrains
    module Types
      class CreateLogDrainRequest < Internal::Types::Model
        field :url, -> { String }, optional: false, nullable: false

        field :description, -> { String }, optional: true, nullable: false

        field :sources, -> { Internal::Types::Array[Coss::Types::LogDrainSource] }, optional: true, nullable: false
      end
    end
  end
end
