# frozen_string_literal: true

module Coss
  module Risk
    module LimitBuckets
      module Types
        class CreateRiskLimitBucketRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: false, nullable: false

          field :period_seconds, -> { Integer }, optional: false, nullable: false

          field :burst, -> { Integer }, optional: true, nullable: false

          field :on_failure, -> { Coss::Risk::LimitBuckets::Types::CreateRiskLimitBucketRequestOnFailure }, optional: true, nullable: false
        end
      end
    end
  end
end
