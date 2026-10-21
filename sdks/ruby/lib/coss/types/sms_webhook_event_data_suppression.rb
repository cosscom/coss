# frozen_string_literal: true

module Coss
  module Types
    # `sms.suppressed`: the entry that made coss.com skip the number.
    class SmsWebhookEventDataSuppression < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::SmsWebhookEventDataSuppressionReason }, optional: false, nullable: false
    end
  end
end
