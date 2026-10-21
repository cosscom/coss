# frozen_string_literal: true

module Coss
  module Types
    # Why the message failed or wasn't delivered.
    class SmsWebhookEventDataFailure < Internal::Types::Model
      field :code, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
