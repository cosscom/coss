# frozen_string_literal: true

module Coss
  module Types
    # Where a booking meets. `link`, `phone` and `in_person` carry their details, and on an event type, left blank, use
    # the booked host's own if they have one; `google_meet`, `microsoft_teams` and `zoom` get a meeting made on the
    # host's connected account.
    class SchedulingLocation < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::SchedulingLocationZero }

      member -> { Coss::Types::SchedulingLocationNumber }

      member -> { Coss::Types::SchedulingLocationAddress }

      member -> { Coss::Types::SchedulingLocationThree }

      member -> { Coss::Types::SchedulingLocationFour }

      member -> { Coss::Types::SchedulingLocationFive }
    end
  end
end
