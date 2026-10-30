# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignTemplateRequestFieldsItemDocument < Internal::Types::Model
          field :type, -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestFieldsItemDocumentType }, optional: false, nullable: false

          field :required, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :label, -> { String }, optional: true, nullable: false

          field :document, -> { Integer }, optional: true, nullable: false

          field :page, -> { Integer }, optional: false, nullable: false

          field :x, -> { Integer }, optional: false, nullable: false

          field :y, -> { Integer }, optional: false, nullable: false

          field :width, -> { Integer }, optional: false, nullable: false

          field :height, -> { Integer }, optional: false, nullable: false

          field :role, -> { String }, optional: false, nullable: false

          field :merge_key, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
