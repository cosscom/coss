# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class RiskEmailCheckRequest < Internal::Types::Model
        field :email, -> { String }, optional: false, nullable: false
      end
    end
  end
end
