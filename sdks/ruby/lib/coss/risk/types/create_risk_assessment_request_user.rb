# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class CreateRiskAssessmentRequestUser < Internal::Types::Model
        field :id, -> { String }, optional: true, nullable: false

        field :email, -> { String }, optional: true, nullable: false
      end
    end
  end
end
