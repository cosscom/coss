# frozen_string_literal: true

module Coss
  module Types
    class InboxMessageReceivedWebhookEventData < Internal::Types::Model
      field :inbox_id, -> { String }, optional: false, nullable: false

      field :inbox_address, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false

      field :message_id, -> { String }, optional: false, nullable: false

      field :received_email_id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: true

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :attachment_count, -> { Integer }, optional: false, nullable: false

      field :new_thread, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :spam, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false
    end
  end
end
