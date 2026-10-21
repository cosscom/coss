# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class CreateRiskAssessmentRequestCaptcha < Internal::Types::Model
        field :token, -> { String }, optional: false, nullable: false
      end
    end
  end
end
