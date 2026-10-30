# frozen_string_literal: true

module Coss
  module Types
    class InboxMessageList < Internal::Types::Model
      field :object, -> { Coss::Types::InboxMessageListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::InboxMessageSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
