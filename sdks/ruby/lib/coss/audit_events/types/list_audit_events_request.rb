# frozen_string_literal: true

module Coss
  module AuditEvents
    module Types
      class ListAuditEventsRequest < Internal::Types::Model
        field :action, -> { String }, optional: true, nullable: false

        field :actor_type, -> { String }, optional: true, nullable: false

        field :actor_id, -> { String }, optional: true, nullable: false

        field :target_id, -> { String }, optional: true, nullable: false

        field :environment_id, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
