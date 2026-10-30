# frozen_string_literal: true

module Coss
  module Types
    class SubaccountStatsDay < Internal::Types::Model
      field :date, -> { String }, optional: false, nullable: false

      field :recipients, -> { Integer }, optional: false, nullable: false

      field :sent, -> { Integer }, optional: false, nullable: false

      field :delivered, -> { Integer }, optional: false, nullable: false

      field :bounced, -> { Integer }, optional: false, nullable: false

      field :complained, -> { Integer }, optional: false, nullable: false

      field :failed, -> { Integer }, optional: false, nullable: false

      field :suppressed, -> { Integer }, optional: false, nullable: false
    end
  end
end
