# frozen_string_literal: true

module Coss
  module Types
    class DomainWebhookEventData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :domain_id, -> { String }, optional: false, nullable: false

      field :domain, -> { String }, optional: false, nullable: false

      field :dmarc_report_id, -> { String }, optional: false, nullable: false

      field :reporter, -> { String }, optional: false, nullable: false

      field :period_start, -> { String }, optional: false, nullable: false

      field :period_end, -> { String }, optional: false, nullable: false

      field :messages, -> { Integer }, optional: false, nullable: false

      field :passing, -> { Integer }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
