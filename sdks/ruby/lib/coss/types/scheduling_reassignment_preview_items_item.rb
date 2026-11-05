# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentPreviewItemsItem < Internal::Types::Model
      field :booking, -> { String }, optional: false, nullable: false

      field :event_type, -> { String }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SchedulingReassignmentPreviewItemsItemStatus }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"

      field :series, -> { String }, optional: false, nullable: true

      field :group_session, -> { String }, optional: false, nullable: true

      field :from_host, -> { String }, optional: false, nullable: true

      field :to_host, -> { String }, optional: false, nullable: true

      field :reason, -> { String }, optional: false, nullable: true
    end
  end
end
