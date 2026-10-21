# frozen_string_literal: true

module Coss
  module Types
    module DomainRecordType
      extend Coss::Internal::Types::Enum

      CNAME = "CNAME"
      MX = "MX"
      TXT = "TXT"
    end
  end
end
