# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointWebhookEventData < Internal::Types::Model
      field :application_id, -> { String }, optional: false, nullable: false

      field :application_uid, -> { String }, optional: false, nullable: true

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :failing_since, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
