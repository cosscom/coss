# frozen_string_literal: true

module Coss
  module Types
    class SchedulingLocationAddress < Internal::Types::Model
      field :type, -> { Coss::Types::SchedulingLocationAddressType }, optional: false, nullable: false

      field :address, -> { String }, optional: true, nullable: false
    end
  end
end
