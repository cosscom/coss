# frozen_string_literal: true

module Coss
  module Types
    class ContactWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::ContactWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::ContactWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::ContactWebhookEventData }, optional: false, nullable: false
    end
  end
end
