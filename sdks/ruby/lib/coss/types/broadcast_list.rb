# frozen_string_literal: true

module Coss
  module Types
    class BroadcastList < Internal::Types::Model
      field :object, -> { Coss::Types::BroadcastListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Broadcast] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
