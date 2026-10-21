# frozen_string_literal: true

module Coss
  module Types
    class ContactTopicsTopicsItem < Internal::Types::Model
      field :topic, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :subscribed, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :choice, -> { Coss::Types::ContactTopicsTopicsItemChoice }, optional: false, nullable: true
    end
  end
end
