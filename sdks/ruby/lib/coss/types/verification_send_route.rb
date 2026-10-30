# frozen_string_literal: true

module Coss
  module Types
    module VerificationSendRoute
      extend Coss::Internal::Types::Enum

      OWN_NUMBER = "own_number"
      SHARED_NUMBER = "shared_number"
      EMAIL = "email"
      COSS_EMAIL = "coss_email"
    end
  end
end
