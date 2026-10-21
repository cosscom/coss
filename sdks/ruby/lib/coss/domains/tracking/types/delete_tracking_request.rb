# frozen_string_literal: true

module Coss
  module Domains
    module Tracking
      module Types
        class DeleteTrackingRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
