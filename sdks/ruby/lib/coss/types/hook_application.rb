# frozen_string_literal: true

module Coss
  module Types
    class HookApplication < Internal::Types::Model
      field :object, -> { Coss::Types::HookApplicationObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :uid, -> { String }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :metadata, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
