# frozen_string_literal: true

module Coss
  module Types
    # A domain's custom tracking domain: open pixels and click redirects of emails sent from the domain use it while it
    # is `active`.
    class TrackingDomain < Internal::Types::Model
      field :hostname, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::TrackingDomainStatus }, optional: false, nullable: false

      field :record, -> { Coss::Types::TrackingDomainRecord }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :last_checked_at, -> { String }, optional: false, nullable: true

      field :activated_at, -> { String }, optional: false, nullable: true

      field :failed_at, -> { String }, optional: false, nullable: true
    end
  end
end
