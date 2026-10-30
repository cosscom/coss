# frozen_string_literal: true

module Coss
  module Types
    class FormList < Internal::Types::Model
      field :object, -> { Coss::Types::FormListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Form] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
