# frozen_string_literal: true

module Coss
  module Types
    class TemplateVariableInput < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::TemplateVariableInputType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :default, -> { Coss::Types::TemplateVariableInputDefault }, optional: true, nullable: false

      field :description, -> { String }, optional: true, nullable: false

      field :fields, -> { Internal::Types::Array[Coss::Types::TemplateVariableInputFieldsItem] }, optional: true, nullable: false
    end
  end
end
