# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationThree < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationThreeType }, optional: false, nullable: false
    end
  end
end
