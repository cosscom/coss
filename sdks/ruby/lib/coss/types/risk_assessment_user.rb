# frozen_string_literal: true

module Coss
  module Types
    class RiskAssessmentUser < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: true

      field :email, -> { String }, optional: false, nullable: true
    end
  end
end
