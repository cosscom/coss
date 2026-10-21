# frozen_string_literal: true

module Coss
  module Types
    class DomainDmarc < Internal::Types::Model
      field :object, -> { Coss::Types::DomainDmarcObject }, optional: false, nullable: false

      field :domain_id, -> { String }, optional: false, nullable: false

      field :report_address, -> { String }, optional: false, nullable: true

      field :record, -> { Coss::Types::DmarcPublishedRecord }, optional: false, nullable: true

      field :policy, -> { Coss::Types::DomainDmarcPolicy }, optional: false, nullable: true

      field :inherited_from, -> { String }, optional: false, nullable: true

      field :policy_since, -> { String }, optional: false, nullable: true

      field :stage, -> { Coss::Types::DomainDmarcStage }, optional: false, nullable: false

      field :partial, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :reporting, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :ready, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :next_, -> { Coss::Types::DomainDmarcNext }, optional: false, nullable: true, api_name: "next"

      field :checks, -> { Internal::Types::Array[Coss::Types::DomainDmarcChecksItem] }, optional: false, nullable: false

      field :warnings, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :report_summary, -> { Coss::Types::DomainDmarcReportSummary }, optional: false, nullable: false
    end
  end
end
