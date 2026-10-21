# frozen_string_literal: true

module Coss
  module Types
    class DeletedTrackingRule < Internal::Types::Model
      field :object, -> { Coss::Types::DeletedTrackingRuleObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :category, -> { String }, optional: false, nullable: true

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
