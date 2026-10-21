# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportSummary < Internal::Types::Model
      field :object, -> { Coss::Types::DmarcReportSummaryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :domain_id, -> { String }, optional: false, nullable: false

      field :reporter, -> { Coss::Types::DmarcReportSummaryReporter }, optional: false, nullable: false

      field :report_id, -> { String }, optional: false, nullable: false

      field :period_start, -> { String }, optional: false, nullable: false

      field :period_end, -> { String }, optional: false, nullable: false

      field :policy_published, -> { Coss::Types::DmarcReportSummaryPolicyPublished }, optional: false, nullable: false

      field :messages, -> { Integer }, optional: false, nullable: false

      field :passing, -> { Integer }, optional: false, nullable: false

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false
    end
  end
end
