# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignTemplateRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :title, -> { String }, optional: true, nullable: false

          field :message, -> { String }, optional: true, nullable: false

          field :signing_order, -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestSigningOrder }, optional: true, nullable: false

          field :documents, -> { Internal::Types::Array[Coss::Sign::Templates::Types::CreateSignTemplateRequestDocumentsItem] }, optional: true, nullable: false

          field :roles, -> { Internal::Types::Array[Coss::Sign::Templates::Types::CreateSignTemplateRequestRolesItem] }, optional: true, nullable: false

          field :fields, -> { Internal::Types::Array[Coss::Sign::Templates::Types::CreateSignTemplateRequestFieldsItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
