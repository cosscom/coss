# frozen_string_literal: true

module Coss
  module Types
    class DomainBimiIssuesItem < Internal::Types::Model
      field :code, -> { Coss::Types::DomainBimiIssuesItemCode }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
