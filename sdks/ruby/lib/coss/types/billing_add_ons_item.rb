# frozen_string_literal: true

module Coss
  module Types
    class BillingAddOnsItem < Internal::Types::Model
      field :key, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :quantity, -> { Integer }, optional: false, nullable: false

      field :unit_amount, -> { Integer }, optional: false, nullable: false

      field :interval, -> { Coss::Types::BillingAddOnsItemInterval }, optional: false, nullable: false
    end
  end
end
