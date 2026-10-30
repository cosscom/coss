# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class UpdateSignTemplateRequestFieldsItemAnchor < Internal::Types::Model
          field :type, -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestFieldsItemAnchorType }, optional: false, nullable: false

          field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :label, -> { String }, optional: true, nullable: false

          field :anchor, -> { String }, optional: false, nullable: false

          field :width, -> { Integer }, optional: true, nullable: false

          field :height, -> { Integer }, optional: true, nullable: false

          field :offset_x, -> { Integer }, optional: true, nullable: false

          field :offset_y, -> { Integer }, optional: true, nullable: false

          field :role, -> { String }, optional: false, nullable: false

          field :merge_key, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
