# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.rescheduled`.
    class EmailWebhookEventDataReschedule < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false

      field :previous_scheduled_at, -> { String }, optional: false, nullable: false
    end
  end
end
