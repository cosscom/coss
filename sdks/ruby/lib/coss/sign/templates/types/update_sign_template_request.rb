# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class UpdateSignTemplateRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :title, -> { String }, optional: true, nullable: false

          field :message, -> { String }, optional: true, nullable: false

          field :signing_order, -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestSigningOrder }, optional: true, nullable: false

          field :documents, -> { Internal::Types::Array[Coss::Sign::Templates::Types::UpdateSignTemplateRequestDocumentsItem] }, optional: true, nullable: false

          field :roles, -> { Internal::Types::Array[Coss::Sign::Templates::Types::UpdateSignTemplateRequestRolesItem] }, optional: true, nullable: false

          field :fields, -> { Internal::Types::Array[Coss::Sign::Templates::Types::UpdateSignTemplateRequestFieldsItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
