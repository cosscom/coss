# frozen_string_literal: true

module Coss
  module Types
    class ContactProperty < Internal::Types::Model
      field :object, -> { Coss::Types::ContactPropertyObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :key, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::ContactPropertyType }, optional: false, nullable: false

      field :fallback, -> { Coss::Types::ContactPropertyFallback }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
