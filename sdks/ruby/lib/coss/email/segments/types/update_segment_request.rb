# frozen_string_literal: true

module Coss
  module Email
    module Segments
      module Types
        class UpdateSegmentRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :filter, -> { Coss::Types::SegmentFilter }, optional: true, nullable: false
        end
      end
    end
  end
end
