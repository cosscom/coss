# frozen_string_literal: true

module Coss
  module Types
    module DomainDmarcChecksItemID
      extend Coss::Internal::Types::Enum

      COVERAGE = "coverage"
      RECENT = "recent"
      COMPLETE = "complete"
      TIME_AT_POLICY = "time_at_policy"
      COSS_PASS_RATE = "coss_pass_rate"
      PASS_RATE = "pass_rate"
      SOURCES = "sources"
    end
  end
end
