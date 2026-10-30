# frozen_string_literal: true

module Coss
  module Types
    class RiskPhoneCarrier < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: true

      field :mobile_country_code, -> { String }, optional: false, nullable: true

      field :mobile_network_code, -> { String }, optional: false, nullable: true
    end
  end
end
