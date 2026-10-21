# frozen_string_literal: true

module Coss
  module Types
    module LogDrainSource
      extend Coss::Internal::Types::Enum

      API = "api"
      EMAIL = "email"
      WEBHOOK = "webhook"
      RISK = "risk"
      SMTP = "smtp"
      AUDIT = "audit"
    end
  end
end
