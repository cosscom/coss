# frozen_string_literal: true

module Coss
  module Types
    class InboxList < Internal::Types::Model
      field :object, -> { Coss::Types::InboxListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Inbox] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
