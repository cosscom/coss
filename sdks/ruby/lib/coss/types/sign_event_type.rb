# frozen_string_literal: true

module Coss
  module Types
    module SignEventType
      extend Coss::Internal::Types::Enum

      CREATED = "created"
      SENT = "sent"
      NOTIFIED = "notified"
      VIEWED = "viewed"
      CONSENTED = "consented"
      SIGNED = "signed"
      DECLINED = "declined"
      REMINDED = "reminded"
      CANCELED = "canceled"
      EXPIRED = "expired"
      COMPLETED = "completed"
      SEALED = "sealed"
    end
  end
end
