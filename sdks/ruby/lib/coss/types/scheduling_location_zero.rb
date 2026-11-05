# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationZero < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationZeroType }, optional: false, nullable: false

      field :url, -> { String }, optional: true, nullable: false
    end
  end
end
