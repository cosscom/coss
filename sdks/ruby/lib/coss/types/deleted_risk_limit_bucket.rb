# frozen_string_literal: true

module Coss
  module Types
    class DeletedRiskLimitBucket < Internal::Types::Model
      field :object, -> { Coss::Types::DeletedRiskLimitBucketObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
