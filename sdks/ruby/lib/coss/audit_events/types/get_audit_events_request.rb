# frozen_string_literal: true

module Coss
  module AuditEvents
    module Types
      class GetAuditEventsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
