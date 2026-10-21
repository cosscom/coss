# frozen_string_literal: true

module Coss
  module Types
    module EmailWebhookEventDataBounceType
      extend Coss::Internal::Types::Enum

      PERMANENT = "permanent"
      TRANSIENT = "transient"
      UNDETERMINED = "undetermined"
    end
  end
end
