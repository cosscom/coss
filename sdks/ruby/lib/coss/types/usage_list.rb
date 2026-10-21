# frozen_string_literal: true

module Coss
  module Types
    class UsageList < Internal::Types::Model
      field :object, -> { Coss::Types::UsageListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Usage] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
