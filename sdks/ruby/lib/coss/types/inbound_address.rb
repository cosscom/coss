# frozen_string_literal: true

module Coss
  module Types
    class InboundAddress < Internal::Types::Model
      field :object, -> { Coss::Types::InboundAddressObject }, optional: false, nullable: false

      field :environment_id, -> { String }, optional: false, nullable: false

      field :domain, -> { String }, optional: false, nullable: false
    end
  end
end
