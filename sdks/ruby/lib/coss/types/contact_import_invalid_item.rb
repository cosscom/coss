# frozen_string_literal: true

module Coss
  module Types
    class ContactImportInvalidItem < Internal::Types::Model
      field :index, -> { Integer }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
