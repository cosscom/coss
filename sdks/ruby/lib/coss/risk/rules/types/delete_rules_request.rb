# frozen_string_literal: true

module Coss
  module Risk
    module Rules
      module Types
        class DeleteRulesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
