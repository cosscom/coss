# frozen_string_literal: true

module Coss
  module Types
    # This month so far, as it would be invoiced if it ended now.
    class BillingEstimate < Internal::Types::Model
      field :usage, -> { Integer }, optional: false, nullable: false

      field :discount, -> { Integer }, optional: false, nullable: false

      field :credit, -> { Integer }, optional: false, nullable: false

      field :total, -> { Integer }, optional: false, nullable: false
    end
  end
end
