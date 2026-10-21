# frozen_string_literal: true

module Coss
  module Types
    class ContactImport < Internal::Types::Model
      field :object, -> { Coss::Types::ContactImportObject }, optional: false, nullable: false

      field :created, -> { Integer }, optional: false, nullable: false

      field :updated, -> { Integer }, optional: false, nullable: false

      field :kept_unsubscribed, -> { Integer }, optional: false, nullable: false

      field :invalid, -> { Internal::Types::Array[Coss::Types::ContactImportInvalidItem] }, optional: false, nullable: false
    end
  end
end
