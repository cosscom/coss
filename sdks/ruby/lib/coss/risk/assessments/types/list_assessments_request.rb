# frozen_string_literal: true

module Coss
  module Risk
    module Assessments
      module Types
        class ListAssessmentsRequest < Internal::Types::Model
          field :event, -> { Coss::Types::RiskEvent }, optional: true, nullable: false

          field :decision, -> { Coss::Types::RiskDecision }, optional: true, nullable: false

          field :user_id, -> { String }, optional: true, nullable: false

          field :review_status, -> { Coss::Risk::Assessments::Types::ListAssessmentsRequestReviewStatus }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
