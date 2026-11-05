# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOutOfOfficeConflict < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingOutOfOfficeConflictObject }, optional: false, nullable: false

      field :booking, -> { String }, optional: false, nullable: false

      field :event_type, -> { String }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SchedulingOutOfOfficeConflictStatus }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"

      field :series, -> { String }, optional: false, nullable: true

      field :group_session, -> { String }, optional: false, nullable: true
    end
  end
end
