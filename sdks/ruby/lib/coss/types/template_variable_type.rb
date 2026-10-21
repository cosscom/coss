# frozen_string_literal: true

module Coss
  module Types
    module TemplateVariableType
      extend Coss::Internal::Types::Enum

      STRING = "string"
      NUMBER = "number"
      BOOLEAN = "boolean"
      LIST = "list"
    end
  end
end
