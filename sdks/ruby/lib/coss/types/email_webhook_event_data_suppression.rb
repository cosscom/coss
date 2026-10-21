# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.suppressed`: the entry that matched the recipient.
    class EmailWebhookEventDataSuppression < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :scope, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::EmailWebhookEventDataSuppressionReason }, optional: false, nullable: false
    end
  end
end
