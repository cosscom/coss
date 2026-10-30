# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      module Types
        class StatsSubaccountsRequest < Internal::Types::Model
          field :subaccount, -> { String }, optional: false, nullable: false

          field :from, -> { String }, optional: true, nullable: false

          field :to, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
