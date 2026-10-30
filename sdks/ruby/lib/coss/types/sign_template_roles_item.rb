# frozen_string_literal: true

module Coss
  module Types
    class SignTemplateRolesItem < Internal::Types::Model
      field :key, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false
    end
  end
end
