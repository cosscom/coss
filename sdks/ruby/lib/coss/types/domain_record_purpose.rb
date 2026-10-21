# frozen_string_literal: true

module Coss
  module Types
    module DomainRecordPurpose
      extend Coss::Internal::Types::Enum

      DKIM = "dkim"
      MAIL_FROM_MX = "mail_from_mx"
      MAIL_FROM_SPF = "mail_from_spf"
      DMARC = "dmarc"
    end
  end
end
