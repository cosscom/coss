# frozen_string_literal: true

module Coss
  module Verify
    module Types
      class StartVerificationRequestTagsItem < Internal::Types::Model
        field :name, -> { String }, optional: false, nullable: false

        field :value, -> { String }, optional: false, nullable: false
      end
    end
  end
end
