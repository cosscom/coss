# frozen_string_literal: true

module Coss
  module Types
    class EmailTemplate < Internal::Types::Model
      field :object, -> { Coss::Types::EmailTemplateObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :alias_, -> { String }, optional: false, nullable: true, api_name: "alias"

      field :name, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :published_version, -> { Integer }, optional: false, nullable: true

      field :published_at, -> { String }, optional: false, nullable: true

      field :has_unpublished_changes, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
