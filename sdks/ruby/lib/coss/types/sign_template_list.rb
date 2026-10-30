# frozen_string_literal: true

module Coss
  module Types
    class SignTemplateList < Internal::Types::Model
      field :object, -> { Coss::Types::SignTemplateListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SignTemplate] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
