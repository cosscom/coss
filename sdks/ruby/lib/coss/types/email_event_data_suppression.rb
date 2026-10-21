# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.suppressed`: the entry that matched the recipient.
    class EmailEventDataSuppression < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :scope, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::EmailEventDataSuppressionReason }, optional: false, nullable: false
    end
  end
end
