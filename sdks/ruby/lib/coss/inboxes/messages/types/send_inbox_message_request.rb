# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class SendInboxMessageRequest < Internal::Types::Model
          field :inbox_id, -> { String }, optional: false, nullable: false

          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :to, -> { Coss::Inboxes::Messages::Types::SendInboxMessageRequestTo }, optional: false, nullable: false

          field :cc, -> { Coss::Inboxes::Messages::Types::SendInboxMessageRequestCc }, optional: true, nullable: false

          field :bcc, -> { Coss::Inboxes::Messages::Types::SendInboxMessageRequestBcc }, optional: true, nullable: false

          field :subject, -> { String }, optional: false, nullable: false

          field :text, -> { String }, optional: true, nullable: false

          field :html, -> { String }, optional: true, nullable: false

          field :attachments, -> { Internal::Types::Array[Coss::Types::SendEmailAttachment] }, optional: true, nullable: false

          field :tags, -> { Internal::Types::Array[Coss::Inboxes::Messages::Types::SendInboxMessageRequestTagsItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
