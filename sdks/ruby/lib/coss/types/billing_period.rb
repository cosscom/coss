# frozen_string_literal: true

module Coss
  module Types
    # The current billing month (UTC).
    class BillingPeriod < Internal::Types::Model
      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"
    end
  end
end
