# frozen_string_literal: true

module Coss
  module Types
    module DomainDmarcStage
      extend Coss::Internal::Types::Enum

      NOT_CHECKED = "not_checked"
      NO_RECORD = "no_record"
      MONITORING = "monitoring"
      QUARANTINE = "quarantine"
      REJECT = "reject"
    end
  end
end
