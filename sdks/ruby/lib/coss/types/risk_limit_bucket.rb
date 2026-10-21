# frozen_string_literal: true

module Coss
  module Types
    class RiskLimitBucket < Internal::Types::Model
      field :object, -> { Coss::Types::RiskLimitBucketObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :limit, -> { Integer }, optional: false, nullable: false

      field :period_seconds, -> { Integer }, optional: false, nullable: false

      field :burst, -> { Integer }, optional: false, nullable: false

      field :on_failure, -> { Coss::Types::RiskLimitBucketOnFailure }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
