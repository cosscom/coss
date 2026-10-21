# frozen_string_literal: true

module Coss
  module Types
    class DomainDmarcChecksItem < Internal::Types::Model
      field :id, -> { Coss::Types::DomainDmarcChecksItemID }, optional: false, nullable: false

      field :ok, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
