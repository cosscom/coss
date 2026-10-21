# frozen_string_literal: true

module Coss
  module Types
    class TemplateContentInput < Internal::Types::Model
      field :locale, -> { String }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: false

      field :html, -> { String }, optional: true, nullable: false

      field :text, -> { String }, optional: true, nullable: false
    end
  end
end
