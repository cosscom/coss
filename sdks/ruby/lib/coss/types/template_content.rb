# frozen_string_literal: true

module Coss
  module Types
    class TemplateContent < Internal::Types::Model
      field :locale, -> { String }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: false

      field :html, -> { String }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: true
    end
  end
end
