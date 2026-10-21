# frozen_string_literal: true

module Coss
  module Types
    class ErrorBodyIssuesItem < Internal::Types::Model
      field :path, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
