# frozen_string_literal: true

module Coss
  module Types
    class TemplateProblem < Internal::Types::Model
      field :locale, -> { String }, optional: false, nullable: false

      field :field, -> { Coss::Types::TemplateProblemField }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false

      field :line, -> { Integer }, optional: false, nullable: false

      field :column, -> { Integer }, optional: false, nullable: false
    end
  end
end
