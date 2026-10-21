# frozen_string_literal: true

module Coss
  module Types
    # The API key making this request.
    class EnvironmentAPIKey < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: true

      field :start, -> { String }, optional: false, nullable: true
    end
  end
end
