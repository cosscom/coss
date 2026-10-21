# frozen_string_literal: true

module Coss
  module Types
    class EmailTemplateReference < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :version, -> { Integer }, optional: false, nullable: true

      field :locale, -> { String }, optional: false, nullable: false
    end
  end
end
