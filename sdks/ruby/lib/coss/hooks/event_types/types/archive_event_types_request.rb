# frozen_string_literal: true

module Coss
  module Hooks
    module EventTypes
      module Types
        class ArchiveEventTypesRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
