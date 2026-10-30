# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class ReplyInboxMessageRequest < Internal::Types::Model
          field :inbox_id, -> { String }, optional: false, nullable: false

          field :message_id, -> { String }, optional: false, nullable: false

          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :reply_all, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :cc, -> { Coss::Inboxes::Messages::Types::ReplyInboxMessageRequestCc }, optional: true, nullable: false

          field :bcc, -> { Coss::Inboxes::Messages::Types::ReplyInboxMessageRequestBcc }, optional: true, nullable: false

          field :text, -> { String }, optional: true, nullable: false

          field :html, -> { String }, optional: true, nullable: false

          field :attachments, -> { Internal::Types::Array[Coss::Types::SendEmailAttachment] }, optional: true, nullable: false

          field :tags, -> { Internal::Types::Array[Coss::Inboxes::Messages::Types::ReplyInboxMessageRequestTagsItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
