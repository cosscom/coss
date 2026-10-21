# frozen_string_literal: true

module Coss
  module Types
    module ContactWebhookEventType
      extend Coss::Internal::Types::Enum

      CONTACT_CREATED = "contact.created"
      CONTACT_UPDATED = "contact.updated"
      CONTACT_DELETED = "contact.deleted"
      CONTACT_UNSUBSCRIBED = "contact.unsubscribed"
      CONTACT_CONFIRMED = "contact.confirmed"
    end
  end
end
