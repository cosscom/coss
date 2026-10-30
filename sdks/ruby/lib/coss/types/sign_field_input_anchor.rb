# frozen_string_literal: true

module Coss
  module Types
    class SignFieldInputAnchor < Internal::Types::Model
      field :type, -> { Coss::Types::SignFieldInputAnchorType }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :label, -> { String }, optional: true, nullable: false

      field :anchor, -> { String }, optional: false, nullable: false

      field :width, -> { Integer }, optional: true, nullable: false

      field :height, -> { Integer }, optional: true, nullable: false

      field :offset_x, -> { Integer }, optional: true, nullable: false

      field :offset_y, -> { Integer }, optional: true, nullable: false
    end
  end
end
