# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationFive < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationFiveType }, optional: false, nullable: false

      field :url, -> { String }, optional: true, nullable: false
    end
  end
end
