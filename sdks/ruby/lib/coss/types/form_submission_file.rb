# frozen_string_literal: true

module Coss
  module Types
    class FormSubmissionFile < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :field, -> { String }, optional: false, nullable: false

      field :filename, -> { String }, optional: false, nullable: false

      field :content_type, -> { String }, optional: false, nullable: false

      field :size, -> { Integer }, optional: false, nullable: false
    end
  end
end
