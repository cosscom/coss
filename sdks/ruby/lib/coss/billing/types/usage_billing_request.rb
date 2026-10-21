# frozen_string_literal: true

module Coss
  module Billing
    module Types
      class UsageBillingRequest < Internal::Types::Model
        field :from, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false

        field :granularity, -> { Coss::Billing::Types::UsageBillingRequestGranularity }, optional: true, nullable: false

        field :group_by, -> { Coss::Billing::Types::UsageBillingRequestGroupBy }, optional: true, nullable: false

        field :meter, -> { Coss::Billing::Types::UsageBillingRequestMeter }, optional: true, nullable: false
      end
    end
  end
end
