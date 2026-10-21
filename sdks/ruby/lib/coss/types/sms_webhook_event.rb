# frozen_string_literal: true

module Coss
  module Types
    class SmsWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::SmsWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::SmsWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::SmsWebhookEventData }, optional: false, nullable: false
    end
  end
end
