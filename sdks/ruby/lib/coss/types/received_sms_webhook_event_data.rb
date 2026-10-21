# frozen_string_literal: true

module Coss
  module Types
    class ReceivedSmsWebhookEventData < Internal::Types::Model
      field :received_sms_id, -> { String }, optional: false, nullable: true

      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false

      field :keyword, -> { Coss::Types::ReceivedSmsWebhookEventDataKeyword }, optional: false, nullable: true

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
