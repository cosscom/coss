# frozen_string_literal: true

module Coss
  module Types
    module DomainDmarcNextKind
      extend Coss::Internal::Types::Enum

      PUBLISH = "publish"
      ADD_REPORTING = "add_reporting"
      COMPLETE_ROLLOUT = "complete_rollout"
      TIGHTEN = "tighten"
    end
  end
end
