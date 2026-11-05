# frozen_string_literal: true

module Coss
  module Scheduling
    module Sessions
      module Types
        class CreateSchedulingManagerSessionRequestHostFilterValue < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { String }

          member -> { Internal::Types::Array[String] }
        end
      end
    end
  end
end
