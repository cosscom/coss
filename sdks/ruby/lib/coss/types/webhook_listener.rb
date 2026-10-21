# frozen_string_literal: true

module Coss
  module Types
    class WebhookListener < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookListenerObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :event_types, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :expires_at, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
