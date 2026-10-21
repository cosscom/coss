# frozen_string_literal: true

module Coss
  module Types
    class SuppressionImport < Internal::Types::Model
      field :object, -> { Coss::Types::SuppressionImportObject }, optional: false, nullable: false

      field :created, -> { Integer }, optional: false, nullable: false

      field :existing, -> { Integer }, optional: false, nullable: false

      field :invalid, -> { Internal::Types::Array[Coss::Types::SuppressionImportInvalidItem] }, optional: false, nullable: false
    end
  end
end
