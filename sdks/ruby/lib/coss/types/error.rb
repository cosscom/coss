# frozen_string_literal: true

module Coss
  module Types
    class Error < Internal::Types::Model
      field :error, -> { Coss::Types::ErrorBody }, optional: false, nullable: false
    end
  end
end
