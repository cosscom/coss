# frozen_string_literal: true

module Coss
  module Types
    class SignTemplate < Internal::Types::Model
      field :object, -> { Coss::Types::SignTemplateObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: true

      field :message, -> { String }, optional: false, nullable: true

      field :signing_order, -> { Coss::Types::SignTemplateSigningOrder }, optional: false, nullable: false

      field :documents, -> { Internal::Types::Array[Coss::Types::SignTemplateDocumentsItem] }, optional: false, nullable: false

      field :roles, -> { Internal::Types::Array[Coss::Types::SignTemplateRolesItem] }, optional: false, nullable: false

      field :fields, -> { Internal::Types::Array[Coss::Types::SignTemplateFieldsItem] }, optional: false, nullable: false

      field :ready, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
