# frozen_string_literal: true

module Coss
  module Types
    module SignRequestWebhookEventType
      extend Coss::Internal::Types::Enum

      SIGN_REQUEST_SENT = "sign_request.sent"
      SIGN_REQUEST_VIEWED = "sign_request.viewed"
      SIGN_REQUEST_SIGNER_SIGNED = "sign_request.signer_signed"
      SIGN_REQUEST_DECLINED = "sign_request.declined"
      SIGN_REQUEST_COMPLETED = "sign_request.completed"
      SIGN_REQUEST_CANCELED = "sign_request.canceled"
      SIGN_REQUEST_EXPIRED = "sign_request.expired"
    end
  end
end
