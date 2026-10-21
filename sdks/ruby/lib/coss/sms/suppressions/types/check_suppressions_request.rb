# frozen_string_literal: true

module Coss
  module Sms
    module Suppressions
      module Types
        class CheckSuppressionsRequest < Internal::Types::Model
          field :phone_number, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
