# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOauthAppWebhookEventData < Internal::Types::Model
      field :oauth_app_id, -> { String }, optional: false, nullable: false

      field :provider, -> { String }, optional: false, nullable: false

      field :code, -> { String }, optional: false, nullable: true

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
