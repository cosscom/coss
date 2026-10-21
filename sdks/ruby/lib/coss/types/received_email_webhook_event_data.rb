# frozen_string_literal: true

module Coss
  module Types
    class ReceivedEmailWebhookEventData < Internal::Types::Model
      field :received_email_id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: true

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :recipients, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :message_id, -> { String }, optional: false, nullable: true

      field :attachment_count, -> { Integer }, optional: false, nullable: false

      field :size, -> { Integer }, optional: false, nullable: false

      field :spam, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :verdicts, -> { Coss::Types::ReceivedEmailVerdicts }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false
    end
  end
end
