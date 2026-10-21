# frozen_string_literal: true

module Coss
  module Email
    module Tracking
      module Types
        class RemoveCategoryTrackingRequest < Internal::Types::Model
          field :category, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
