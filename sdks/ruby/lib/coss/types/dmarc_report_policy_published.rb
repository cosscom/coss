# frozen_string_literal: true

module Coss
  module Types
    # The policy the reporter found when it evaluated the mail.
    class DmarcReportPolicyPublished < Internal::Types::Model
      field :domain, -> { String }, optional: false, nullable: false

      field :p, -> { String }, optional: false, nullable: true

      field :sp, -> { String }, optional: false, nullable: true

      field :np, -> { String }, optional: false, nullable: true

      field :adkim, -> { String }, optional: false, nullable: true

      field :aspf, -> { String }, optional: false, nullable: true

      field :pct, -> { Integer }, optional: false, nullable: true

      field :testing, -> { String }, optional: false, nullable: true
    end
  end
end
