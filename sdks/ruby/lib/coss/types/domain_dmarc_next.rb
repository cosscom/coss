# frozen_string_literal: true

module Coss
  module Types
    class DomainDmarcNext < Internal::Types::Model
      field :kind, -> { Coss::Types::DomainDmarcNextKind }, optional: false, nullable: false

      field :policy, -> { Coss::Types::DomainDmarcNextPolicy }, optional: false, nullable: false

      field :record, -> { String }, optional: false, nullable: false
    end
  end
end
