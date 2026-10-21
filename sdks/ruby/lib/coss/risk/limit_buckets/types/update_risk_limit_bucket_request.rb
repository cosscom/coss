# frozen_string_literal: true

module Coss
  module Risk
    module LimitBuckets
      module Types
        class UpdateRiskLimitBucketRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :period_seconds, -> { Integer }, optional: true, nullable: false

          field :burst, -> { Integer }, optional: true, nullable: false

          field :on_failure, -> { Coss::Risk::LimitBuckets::Types::UpdateRiskLimitBucketRequestOnFailure }, optional: true, nullable: false
        end
      end
    end
  end
end
