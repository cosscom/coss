# frozen_string_literal: true

module Coss
  module Types
    module ErrorBodyType
      extend Coss::Internal::Types::Enum

      INVALID_REQUEST_ERROR = "invalid_request_error"
      AUTHENTICATION_ERROR = "authentication_error"
      PERMISSION_ERROR = "permission_error"
      NOT_FOUND_ERROR = "not_found_error"
      IDEMPOTENCY_ERROR = "idempotency_error"
      RATE_LIMIT_ERROR = "rate_limit_error"
      BILLING_ERROR = "billing_error"
      API_ERROR = "api_error"
    end
  end
end
