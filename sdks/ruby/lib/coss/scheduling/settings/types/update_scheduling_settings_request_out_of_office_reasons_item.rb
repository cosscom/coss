# frozen_string_literal: true

module Coss
  module Scheduling
    module Settings
      module Types
        class UpdateSchedulingSettingsRequestOutOfOfficeReasonsItem < Internal::Types::Model
          field :key, -> { String }, optional: false, nullable: false

          field :label, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
