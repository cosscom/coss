# frozen_string_literal: true

module Coss
  module Risk
    module Lists
      module Types
        class ListListsRequest < Internal::Types::Model
          field :list, -> { Coss::Types::RiskList }, optional: true, nullable: false

          field :type, -> { Coss::Types::RiskListEntryType }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
