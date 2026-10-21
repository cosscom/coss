# frozen_string_literal: true

module Coss
  module LogDrains
    module Batches
      module Types
        class ListBatchesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :status, -> { Coss::LogDrains::Batches::Types::ListBatchesRequestStatus }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
