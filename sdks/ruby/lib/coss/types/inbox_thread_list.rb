# frozen_string_literal: true

module Coss
  module Types
    class InboxThreadList < Internal::Types::Model
      field :object, -> { Coss::Types::InboxThreadListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::InboxThreadSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
