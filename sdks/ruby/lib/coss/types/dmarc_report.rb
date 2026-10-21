# frozen_string_literal: true

module Coss
  module Types
    class DmarcReport < Internal::Types::Model
      field :object, -> { Coss::Types::DmarcReportObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :domain_id, -> { String }, optional: false, nullable: false

      field :reporter, -> { Coss::Types::DmarcReportReporter }, optional: false, nullable: false

      field :report_id, -> { String }, optional: false, nullable: false

      field :period_start, -> { String }, optional: false, nullable: false

      field :period_end, -> { String }, optional: false, nullable: false

      field :policy_published, -> { Coss::Types::DmarcReportPolicyPublished }, optional: false, nullable: false

      field :messages, -> { Integer }, optional: false, nullable: false

      field :passing, -> { Integer }, optional: false, nullable: false

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false

      field :records, -> { Internal::Types::Array[Coss::Types::DmarcReportRecord] }, optional: false, nullable: false
    end
  end
end
