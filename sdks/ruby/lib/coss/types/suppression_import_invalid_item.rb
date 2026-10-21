# frozen_string_literal: true

module Coss
  module Types
    class SuppressionImportInvalidItem < Internal::Types::Model
      field :index, -> { Integer }, optional: false, nullable: false

      field :address, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
