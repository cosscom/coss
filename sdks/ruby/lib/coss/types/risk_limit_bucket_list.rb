# frozen_string_literal: true

module Coss
  module Types
    # Every bucket of the environment (at most 100), by name.
    class RiskLimitBucketList < Internal::Types::Model
      field :object, -> { Coss::Types::RiskLimitBucketListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::RiskLimitBucket] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
