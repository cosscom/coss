# frozen_string_literal: true

module Coss
  module Types
    class DmarcSource < Internal::Types::Model
      field :source_ip, -> { String }, optional: false, nullable: false

      field :header_from, -> { String }, optional: false, nullable: false

      field :messages, -> { Integer }, optional: false, nullable: false

      field :passing, -> { Integer }, optional: false, nullable: false

      field :via_coss, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
