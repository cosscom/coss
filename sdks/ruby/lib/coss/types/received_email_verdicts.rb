# frozen_string_literal: true

module Coss
  module Types
    # What the receiving server concluded: `pass`, `fail`, `gray` (could not decide) or `processing_failed`; `null` when
    # the check did not run.
    class ReceivedEmailVerdicts < Internal::Types::Model
      field :spam, -> { Coss::Types::ReceivedEmailVerdictsSpam }, optional: false, nullable: true

      field :virus, -> { Coss::Types::ReceivedEmailVerdictsVirus }, optional: false, nullable: true

      field :spf, -> { Coss::Types::ReceivedEmailVerdictsSpf }, optional: false, nullable: true

      field :dkim, -> { Coss::Types::ReceivedEmailVerdictsDkim }, optional: false, nullable: true

      field :dmarc, -> { Coss::Types::ReceivedEmailVerdictsDmarc }, optional: false, nullable: true

      field :dmarc_policy, -> { String }, optional: false, nullable: true
    end
  end
end
