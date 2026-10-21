# frozen_string_literal: true

module Coss
  module Types
    class TemplateVariableFieldsItem < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::TemplateVariableFieldsItemType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
