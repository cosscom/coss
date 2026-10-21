# frozen_string_literal: true

module Coss
  module Risk
    module Lists
      module Types
        class CreateRiskListEntryRequest < Internal::Types::Model
          field :list, -> { Coss::Types::RiskList }, optional: false, nullable: false

          field :type, -> { Coss::Types::RiskListEntryType }, optional: false, nullable: false

          field :value, -> { String }, optional: false, nullable: false

          field :note, -> { String }, optional: true, nullable: false

          field :expires_at, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
