# frozen_string_literal: true

module Coss
  module Types
    class RiskAssessment < Internal::Types::Model
      field :object, -> { Coss::Types::RiskAssessmentObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :event, -> { Coss::Types::RiskEvent }, optional: false, nullable: false

      field :event_name, -> { String }, optional: false, nullable: true

      field :decision, -> { Coss::Types::RiskDecision }, optional: false, nullable: false

      field :score, -> { Integer }, optional: false, nullable: false

      field :reasons, -> { Internal::Types::Array[Coss::Types::RiskReason] }, optional: false, nullable: false

      field :signals, -> { Coss::Types::RiskAssessmentSignals }, optional: false, nullable: false

      field :user, -> { Coss::Types::RiskAssessmentUser }, optional: false, nullable: false

      field :ip, -> { String }, optional: false, nullable: true

      field :degraded, -> { Internal::Types::Array[Coss::Types::RiskAssessmentDegradedItem] }, optional: false, nullable: false

      field :outcome, -> { Coss::Types::RiskOutcome }, optional: false, nullable: true

      field :review_status, -> { Coss::Types::RiskAssessmentReviewStatus }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
