# frozen_string_literal: true

module Coss
  module Types
    class ReceivedEmailList < Internal::Types::Model
      field :object, -> { Coss::Types::ReceivedEmailListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::ReceivedEmailSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
