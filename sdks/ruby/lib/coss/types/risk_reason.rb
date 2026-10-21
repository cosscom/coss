# frozen_string_literal: true

module Coss
  module Types
    class RiskReason < Internal::Types::Model
      field :code, -> { Coss::Types::RiskReasonCode }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false

      field :value, -> { Integer }, optional: true, nullable: false

      field :threshold, -> { Integer }, optional: true, nullable: false

      field :window, -> { Coss::Types::RiskReasonWindow }, optional: true, nullable: false

      field :suggestion, -> { String }, optional: true, nullable: false

      field :provider, -> { String }, optional: true, nullable: false

      field :previous_user, -> { String }, optional: true, nullable: false

      field :previous_assessment, -> { String }, optional: true, nullable: false

      field :entry, -> { String }, optional: true, nullable: false

      field :rule, -> { String }, optional: true, nullable: false

      field :name, -> { String }, optional: true, nullable: false

      field :type, -> { Coss::Types::RiskReasonType }, optional: true, nullable: false
    end
  end
end
