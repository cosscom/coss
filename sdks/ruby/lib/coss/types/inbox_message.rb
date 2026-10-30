# frozen_string_literal: true

module Coss
  module Types
    class InboxMessage < Internal::Types::Model
      field :object, -> { Coss::Types::InboxMessageObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :inbox_id, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false

      field :direction, -> { Coss::Types::InboxMessageDirection }, optional: false, nullable: false

      field :status, -> { Coss::Types::InboxMessageStatus }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: true

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :cc, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :preview, -> { String }, optional: false, nullable: true

      field :attachments, -> { Internal::Types::Array[Coss::Types::ReceivedEmailAttachment] }, optional: false, nullable: false

      field :spam, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_email_id, -> { String }, optional: false, nullable: true

      field :email_id, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :reply_to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :message_id, -> { String }, optional: false, nullable: true

      field :in_reply_to, -> { String }, optional: false, nullable: true

      field :references, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: true

      field :extracted_text, -> { String }, optional: false, nullable: true

      field :html, -> { String }, optional: false, nullable: true

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
