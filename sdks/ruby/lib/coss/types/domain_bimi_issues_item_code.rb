# frozen_string_literal: true

module Coss
  module Types
    module DomainBimiIssuesItemCode
      extend Coss::Internal::Types::Enum

      DMARC_MISSING = "dmarc_missing"
      DMARC_NOT_ENFORCED = "dmarc_not_enforced"
      DMARC_PARTIAL = "dmarc_partial"
      RECORD_MULTIPLE = "record_multiple"
      RECORD_INVALID = "record_invalid"
      LOGO_MISSING = "logo_missing"
      LOGO_NOT_HTTPS = "logo_not_https"
      CERTIFICATE_MISSING = "certificate_missing"
      CERTIFICATE_NOT_HTTPS = "certificate_not_https"
    end
  end
end
