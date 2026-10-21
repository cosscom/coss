# frozen_string_literal: true

module Coss
  module Types
    class DedicatedIPPoolIpsItem < Internal::Types::Model
      field :ip, -> { String }, optional: false, nullable: false

      field :delivered7d, -> { Integer }, optional: false, nullable: false, api_name: "delivered_7d"
    end
  end
end
