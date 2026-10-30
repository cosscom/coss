# frozen_string_literal: true

module Coss
  module Types
    # A text anchor found in the document, in points from the page's top left.
    class SignDocumentAnchorsItem < Internal::Types::Model
      field :text, -> { String }, optional: false, nullable: false

      field :page, -> { Integer }, optional: false, nullable: false

      field :x, -> { Integer }, optional: false, nullable: false

      field :y, -> { Integer }, optional: false, nullable: false

      field :width, -> { Integer }, optional: false, nullable: false

      field :height, -> { Integer }, optional: false, nullable: false
    end
  end
end
