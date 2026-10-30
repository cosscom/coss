# frozen_string_literal: true

module Coss
  module Types
    class FormFieldInput < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::FormFieldInputType }, optional: false, nullable: false

      field :label, -> { String }, optional: true, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :placeholder, -> { String }, optional: true, nullable: false

      field :options, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :max_length, -> { Integer }, optional: true, nullable: false
    end
  end
end
