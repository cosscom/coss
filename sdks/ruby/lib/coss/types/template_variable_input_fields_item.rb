# frozen_string_literal: true

module Coss
  module Types
    class TemplateVariableInputFieldsItem < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::TemplateVariableInputFieldsItemType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false
    end
  end
end
