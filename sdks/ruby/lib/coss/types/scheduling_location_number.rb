# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationNumber < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationNumberType }, optional: false, nullable: false

      field :number, -> { String }, optional: true, nullable: false
    end
  end
end
