# frozen_string_literal: true

module Coss
  module Types
    module AuditActorType
      extend Coss::Internal::Types::Enum

      USER = "user"
      API_KEY = "api_key"
      SYSTEM = "system"
    end
  end
end
