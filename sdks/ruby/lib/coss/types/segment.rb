# frozen_string_literal: true

module Coss
  module Types
    class Segment < Internal::Types::Model
      field :object, -> { Coss::Types::SegmentObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :filter, -> { Coss::Types::SegmentFilter }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
