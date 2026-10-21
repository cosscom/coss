# frozen_string_literal: true

module Coss
  module Types
    class TemplateVariable < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::TemplateVariableType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :default, -> { Coss::Types::TemplateVariableDefault }, optional: true, nullable: false

      field :description, -> { String }, optional: true, nullable: false

      field :fields, -> { Internal::Types::Array[Coss::Types::TemplateVariableFieldsItem] }, optional: true, nullable: false
    end
  end
end
