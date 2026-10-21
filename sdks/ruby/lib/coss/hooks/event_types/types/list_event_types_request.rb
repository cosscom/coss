# frozen_string_literal: true

module Coss
  module Hooks
    module EventTypes
      module Types
        class ListEventTypesRequest < Internal::Types::Model
          field :include_archived, -> { Coss::Hooks::EventTypes::Types::ListEventTypesRequestIncludeArchived }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
