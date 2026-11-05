# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      module Types
        # With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
        class PutSchedulingOutOfOfficeRequestReassign < Internal::Types::Model
          field :to_host, -> { String }, optional: true, nullable: false

          field :preferred_hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :otherwise, -> { Coss::Scheduling::OutOfOffice::Types::PutSchedulingOutOfOfficeRequestReassignOtherwise }, optional: true, nullable: false
        end
      end
    end
  end
end
