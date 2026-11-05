# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOutOfOfficeWebhookEventData < Internal::Types::Model
      field :out_of_office_id, -> { String }, optional: false, nullable: false

      field :host_id, -> { String }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"

      field :group, -> { String }, optional: false, nullable: true

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
