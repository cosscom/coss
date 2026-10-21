# frozen_string_literal: true

module Coss
  module Types
    class TopicList < Internal::Types::Model
      field :object, -> { Coss::Types::TopicListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Topic] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
