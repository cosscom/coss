# frozen_string_literal: true

module Coss
  module Types
    class Topic < Internal::Types::Model
      field :object, -> { Coss::Types::TopicObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :key, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :default_subscription, -> { Coss::Types::TopicDefaultSubscription }, optional: false, nullable: false

      field :visibility, -> { Coss::Types::TopicVisibility }, optional: false, nullable: false

      field :position, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
