# frozen_string_literal: true

module Coss
  module Types
    class SubaccountList < Internal::Types::Model
      field :object, -> { Coss::Types::SubaccountListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Subaccount] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
