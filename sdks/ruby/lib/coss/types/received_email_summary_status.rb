# frozen_string_literal: true

module Coss
  module Types
    module ReceivedEmailSummaryStatus
      extend Coss::Internal::Types::Enum

      RECEIVED = "received"
      BLOCKED = "blocked"
    end
  end
end
