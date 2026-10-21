# frozen_string_literal: true

module Coss
  module Email
    module Tracking
      module Types
        class UpdateCategoryTrackingRequest < Internal::Types::Model
          field :category, -> { String }, optional: false, nullable: false

          field :body, -> { Coss::Types::UpdateTrackingRuleRequest }, optional: false, nullable: false
        end
      end
    end
  end
end
