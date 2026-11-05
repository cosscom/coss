# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      module Types
        class RemoveOutOfOfficeRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
