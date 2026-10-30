# frozen_string_literal: true

module Coss
  module Types
    class SignTemplateDocumentsItem < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :filename, -> { String }, optional: false, nullable: false

      field :sha256, -> { String }, optional: false, nullable: false

      field :page_count, -> { Integer }, optional: false, nullable: false

      field :pages, -> { Internal::Types::Array[Coss::Types::SignTemplateDocumentsItemPagesItem] }, optional: false, nullable: false
    end
  end
end
