# frozen_string_literal: true

module Coss
  module Types
    # `sms.suppressed`: the entry that made coss.com skip the number.
    class SmsEventDataSuppression < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::SmsEventDataSuppressionReason }, optional: false, nullable: false
    end
  end
end
