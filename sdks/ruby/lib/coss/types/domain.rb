# frozen_string_literal: true

module Coss
  module Types
    class Domain < Internal::Types::Model
      field :object, -> { Coss::Types::DomainObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::DomainStatus }, optional: false, nullable: false

      field :can_send, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :region, -> { String }, optional: false, nullable: true

      field :mail_from_domain, -> { String }, optional: false, nullable: false

      field :mail_from_status, -> { Coss::Types::DomainMailFromStatus }, optional: false, nullable: false

      field :records, -> { Internal::Types::Array[Coss::Types::DomainRecord] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :last_checked_at, -> { String }, optional: false, nullable: true

      field :verified_at, -> { String }, optional: false, nullable: true

      field :failed_at, -> { String }, optional: false, nullable: true

      field :tracking, -> { Coss::Types::TrackingDomain }, optional: false, nullable: true

      field :receiving, -> { Coss::Types::ReceivingDomain }, optional: false, nullable: true

      field :bimi, -> { Coss::Types::DomainBimi }, optional: false, nullable: false

      field :subaccount_id, -> { String }, optional: false, nullable: true

      field :shared_with_subaccounts, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
