# frozen_string_literal: true

module Coss
  module Forms
    module Submissions
      module Types
        class RemoveSubmissionsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :submission_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
