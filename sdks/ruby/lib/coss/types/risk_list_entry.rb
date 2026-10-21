# frozen_string_literal: true

module Coss
  module Types
    class RiskListEntry < Internal::Types::Model
      field :object, -> { Coss::Types::RiskListEntryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :list, -> { Coss::Types::RiskList }, optional: false, nullable: false

      field :type, -> { Coss::Types::RiskListEntryType }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false

      field :note, -> { String }, optional: false, nullable: true

      field :expires_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
