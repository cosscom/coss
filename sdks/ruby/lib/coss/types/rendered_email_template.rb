# frozen_string_literal: true

module Coss
  module Types
    class RenderedEmailTemplate < Internal::Types::Model
      field :object, -> { Coss::Types::RenderedEmailTemplateObject }, optional: false, nullable: false

      field :template_id, -> { String }, optional: false, nullable: false

      field :version, -> { Integer }, optional: false, nullable: true

      field :locale, -> { String }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: false

      field :html, -> { String }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: true
    end
  end
end
