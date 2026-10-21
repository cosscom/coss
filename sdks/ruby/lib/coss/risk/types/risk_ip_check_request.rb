# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class RiskIPCheckRequest < Internal::Types::Model
        field :ip, -> { String }, optional: false, nullable: false
      end
    end
  end
end
