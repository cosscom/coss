# frozen_string_literal: true

module Coss
  module Types
    class SignRequestDocumentsItem < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :filename, -> { String }, optional: false, nullable: false

      field :sha256, -> { String }, optional: false, nullable: false

      field :page_count, -> { Integer }, optional: false, nullable: false
    end
  end
end
