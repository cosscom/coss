# frozen_string_literal: true

module Coss
  module Types
    class SignDocument < Internal::Types::Model
      field :object, -> { Coss::Types::SignDocumentObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :filename, -> { String }, optional: false, nullable: false

      field :size, -> { Integer }, optional: false, nullable: false

      field :sha256, -> { String }, optional: false, nullable: false

      field :page_count, -> { Integer }, optional: false, nullable: false

      field :pages, -> { Internal::Types::Array[Coss::Types::SignDocumentPagesItem] }, optional: false, nullable: false

      field :anchors, -> { Internal::Types::Array[Coss::Types::SignDocumentAnchorsItem] }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
