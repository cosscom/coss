# frozen_string_literal: true

module Coss
  module Types
    module RiskPhoneCheckLineType
      extend Coss::Internal::Types::Enum

      MOBILE = "mobile"
      LANDLINE = "landline"
      FIXED_VOIP = "fixed_voip"
      NON_FIXED_VOIP = "non_fixed_voip"
      TOLL_FREE = "toll_free"
      PREMIUM = "premium"
      SHARED_COST = "shared_cost"
      PERSONAL = "personal"
      UAN = "uan"
      VOICEMAIL = "voicemail"
      PAGER = "pager"
      UNKNOWN = "unknown"
    end
  end
end
