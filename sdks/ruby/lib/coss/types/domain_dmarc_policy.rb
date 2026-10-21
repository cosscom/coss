# frozen_string_literal: true

module Coss
  module Types
    module DomainDmarcPolicy
      extend Coss::Internal::Types::Enum

      NONE = "none"
      QUARANTINE = "quarantine"
      REJECT = "reject"
    end
  end
end
