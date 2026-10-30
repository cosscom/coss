# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      module Types
        class ReinstateSubaccountsRequest < Internal::Types::Model
          field :subaccount, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
