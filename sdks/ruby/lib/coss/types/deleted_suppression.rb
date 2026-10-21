# frozen_string_literal: true

module Coss
  module Types
    class DeletedSuppression < Internal::Types::Model
      field :object, -> { Coss::Types::DeletedSuppressionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
