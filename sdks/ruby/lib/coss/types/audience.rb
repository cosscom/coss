# frozen_string_literal: true

module Coss
  module Types
    class Audience < Internal::Types::Model
      field :object, -> { Coss::Types::AudienceObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :contact_count, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
