# frozen_string_literal: true

module Coss
  module Types
    # The result of the last BIMI check: whether mailbox providers can find the domain's brand logo and certificate. The
    # record and the certificate are your own.
    class DomainBimi < Internal::Types::Model
      field :status, -> { Coss::Types::DomainBimiStatus }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :record, -> { String }, optional: false, nullable: true

      field :logo_url, -> { String }, optional: false, nullable: true

      field :certificate_url, -> { String }, optional: false, nullable: true

      field :dmarc_policy, -> { Coss::Types::DomainBimiDmarcPolicy }, optional: false, nullable: true

      field :issues, -> { Internal::Types::Array[Coss::Types::DomainBimiIssuesItem] }, optional: false, nullable: false
    end
  end
end
