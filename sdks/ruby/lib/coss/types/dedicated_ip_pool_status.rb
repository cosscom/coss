# frozen_string_literal: true

module Coss
  module Types
    module DedicatedIPPoolStatus
      extend Coss::Internal::Types::Enum

      NOT_ENABLED = "not_enabled"
      WAITING = "waiting"
      PROVISIONING = "provisioning"
      WARMING = "warming"
      READY = "ready"
      RELEASING = "releasing"
    end
  end
end
