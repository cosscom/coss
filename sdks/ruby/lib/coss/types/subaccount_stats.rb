# frozen_string_literal: true

module Coss
  module Types
    class SubaccountStats < Internal::Types::Model
      field :object, -> { Coss::Types::SubaccountStatsObject }, optional: false, nullable: false

      field :subaccount_id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SubaccountStatsDay] }, optional: false, nullable: false
    end
  end
end
