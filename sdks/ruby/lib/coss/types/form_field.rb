# frozen_string_literal: true

module Coss
  module Types
    class FormField < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::FormFieldType }, optional: false, nullable: false

      field :label, -> { String }, optional: false, nullable: true

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :placeholder, -> { String }, optional: false, nullable: true

      field :options, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :max_length, -> { Integer }, optional: false, nullable: true
    end
  end
end
