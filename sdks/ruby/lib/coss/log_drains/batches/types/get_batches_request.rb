# frozen_string_literal: true

module Coss
  module LogDrains
    module Batches
      module Types
        class GetBatchesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :batch_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
