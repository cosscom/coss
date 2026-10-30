# frozen_string_literal: true

module Coss
  module Types
    class SignRequestSignedDocument < Internal::Types::Model
      field :sha256, -> { String }, optional: false, nullable: false

      field :sealed_at, -> { String }, optional: false, nullable: false
    end
  end
end
