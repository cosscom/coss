# frozen_string_literal: true

module Coss
  module Types
    class SegmentList < Internal::Types::Model
      field :object, -> { Coss::Types::SegmentListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Segment] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
