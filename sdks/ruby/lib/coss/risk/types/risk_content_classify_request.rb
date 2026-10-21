# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class RiskContentClassifyRequest < Internal::Types::Model
        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
