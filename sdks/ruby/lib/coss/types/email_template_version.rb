# frozen_string_literal: true

module Coss
  module Types
    class EmailTemplateVersion < Internal::Types::Model
      field :object, -> { Coss::Types::EmailTemplateVersionObject }, optional: false, nullable: false

      field :template_id, -> { String }, optional: false, nullable: false

      field :version, -> { Integer }, optional: false, nullable: true

      field :revision, -> { Integer }, optional: false, nullable: false

      field :default_locale, -> { String }, optional: false, nullable: false

      field :variables, -> { Internal::Types::Array[Coss::Types::TemplateVariable] }, optional: false, nullable: false

      field :sample_variables, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false

      field :contents, -> { Internal::Types::Array[Coss::Types::TemplateContent] }, optional: false, nullable: false

      field :problems, -> { Internal::Types::Array[Coss::Types::TemplateProblem] }, optional: false, nullable: false

      field :published_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
