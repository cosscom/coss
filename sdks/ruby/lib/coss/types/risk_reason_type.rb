# frozen_string_literal: true

module Coss
  module Types
    module RiskReasonType
      extend Coss::Internal::Types::Enum

      EMAIL = "email"
      DOMAIN = "domain"
      IP = "ip"
      ASN = "asn"
      COUNTRY = "country"
      USER = "user"
    end
  end
end
