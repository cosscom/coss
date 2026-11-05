# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationFour < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationFourType }, optional: false, nullable: false
    end
  end
end
