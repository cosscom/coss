# frozen_string_literal: true

module Coss
  module Types
    class ReceivedEmail < Internal::Types::Model
      field :object, -> { Coss::Types::ReceivedEmailObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::ReceivedEmailStatus }, optional: false, nullable: false

      field :blocked_reason, -> { Coss::Types::ReceivedEmailBlockedReason }, optional: false, nullable: true

      field :mail_from, -> { String }, optional: false, nullable: false

      field :recipients, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: true

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :cc, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :message_id, -> { String }, optional: false, nullable: true

      field :attachments, -> { Internal::Types::Array[Coss::Types::ReceivedEmailAttachment] }, optional: false, nullable: false

      field :size, -> { Integer }, optional: false, nullable: false

      field :spam, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :verdicts, -> { Coss::Types::ReceivedEmailVerdicts }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false

      field :reply_to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :in_reply_to, -> { String }, optional: false, nullable: true

      field :references, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :sent_at, -> { String }, optional: false, nullable: true

      field :headers, -> { Internal::Types::Array[Coss::Types::ReceivedEmailHeadersItem] }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: true

      field :html, -> { String }, optional: false, nullable: true

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
