# frozen_string_literal: true

module Coss
  module Types
    class SignTemplateFieldsItem < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :role, -> { String }, optional: false, nullable: false

      field :document_id, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::SignTemplateFieldsItemType }, optional: false, nullable: false

      field :page, -> { Integer }, optional: false, nullable: false

      field :x, -> { Integer }, optional: false, nullable: false

      field :y, -> { Integer }, optional: false, nullable: false

      field :width, -> { Integer }, optional: false, nullable: false

      field :height, -> { Integer }, optional: false, nullable: false

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :label, -> { String }, optional: false, nullable: true

      field :merge_key, -> { String }, optional: false, nullable: true
    end
  end
end
