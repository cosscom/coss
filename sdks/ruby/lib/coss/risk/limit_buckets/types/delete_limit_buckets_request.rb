# frozen_string_literal: true

module Coss
  module Risk
    module LimitBuckets
      module Types
        class DeleteLimitBucketsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
