# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Types
        class UpdateEmailTemplateDraftRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :revision, -> { Integer }, optional: true, nullable: false

          field :default_locale, -> { String }, optional: true, nullable: false

          field :variables, -> { Internal::Types::Array[Coss::Types::TemplateVariableInput] }, optional: true, nullable: false

          field :sample_variables, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false

          field :contents, -> { Internal::Types::Array[Coss::Types::TemplateContentInput] }, optional: true, nullable: false
        end
      end
    end
  end
end
