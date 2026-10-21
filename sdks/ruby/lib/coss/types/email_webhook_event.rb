# frozen_string_literal: true

module Coss
  module Types
    class EmailWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::EmailWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::EmailWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::EmailWebhookEventData }, optional: false, nullable: false
    end
  end
end
