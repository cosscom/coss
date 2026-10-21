# frozen_string_literal: true

module Coss
  module Types
    class BillingUsageItem < Internal::Types::Model
      field :meter, -> { Coss::Types::BillingUsageItemMeter }, optional: false, nullable: false

      field :quantity, -> { Integer }, optional: false, nullable: false

      field :included, -> { Integer }, optional: false, nullable: true
    end
  end
end
