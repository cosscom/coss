# frozen_string_literal: true

module Coss
  module Verify
    module Types
      class CancelVerifyRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
