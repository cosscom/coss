# frozen_string_literal: true

module Coss
  module Types
    class SignDocumentPagesItem < Internal::Types::Model
      field :width, -> { Integer }, optional: false, nullable: false

      field :height, -> { Integer }, optional: false, nullable: false
    end
  end
end
