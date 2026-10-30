# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class RiskPhoneCheckRequest < Internal::Types::Model
        field :phone, -> { String }, optional: false, nullable: false
      end
    end
  end
end
