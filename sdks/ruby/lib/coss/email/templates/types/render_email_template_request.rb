# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Types
        class RenderEmailTemplateRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :version, -> { Integer }, optional: true, nullable: false

          field :locale, -> { String }, optional: true, nullable: false

          field :variables, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false
        end
      end
    end
  end
end
