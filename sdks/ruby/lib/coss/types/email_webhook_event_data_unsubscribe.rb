# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.suppressed` without `suppression`: the recipient is a contact who unsubscribed (from marketing, or
    # from the email's topic, `topic`).
    class EmailWebhookEventDataUnsubscribe < Internal::Types::Model
      field :contact_id, -> { String }, optional: false, nullable: true

      field :topic, -> { String }, optional: false, nullable: true
    end
  end
end
