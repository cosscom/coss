# frozen_string_literal: true

module Coss
  module Types
    class BroadcastEmailList < Internal::Types::Model
      field :object, -> { Coss::Types::BroadcastEmailListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Email] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
