# frozen_string_literal: true

module Coss
  module Types
    class SignFieldInputDocument < Internal::Types::Model
      field :type, -> { Coss::Types::SignFieldInputDocumentType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :label, -> { String }, optional: true, nullable: false

      field :document, -> { Integer }, optional: true, nullable: false

      field :page, -> { Integer }, optional: false, nullable: false

      field :x, -> { Integer }, optional: false, nullable: false

      field :y, -> { Integer }, optional: false, nullable: false

      field :width, -> { Integer }, optional: false, nullable: false

      field :height, -> { Integer }, optional: false, nullable: false
    end
  end
end
