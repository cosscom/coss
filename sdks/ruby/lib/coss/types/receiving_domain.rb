# frozen_string_literal: true

module Coss
  module Types
    # A domain's receiving hostname: email sent to any address at it becomes a received email of its environment.
    class ReceivingDomain < Internal::Types::Model
      field :hostname, -> { String }, optional: false, nullable: false

      field :environment_id, -> { String }, optional: false, nullable: false

      field :record, -> { Coss::Types::ReceivingDomainRecord }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :last_checked_at, -> { String }, optional: false, nullable: true
    end
  end
end
