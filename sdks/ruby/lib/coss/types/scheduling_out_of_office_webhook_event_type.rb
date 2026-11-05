# frozen_string_literal: true

module Coss
  module Types
    module SchedulingOutOfOfficeWebhookEventType
      extend Coss::Internal::Types::Enum

      SCHEDULING_OUT_OF_OFFICE_CREATED = "scheduling.out_of_office.created"
      SCHEDULING_OUT_OF_OFFICE_UPDATED = "scheduling.out_of_office.updated"
      SCHEDULING_OUT_OF_OFFICE_DELETED = "scheduling.out_of_office.deleted"
      SCHEDULING_OUT_OF_OFFICE_STARTED = "scheduling.out_of_office.started"
      SCHEDULING_OUT_OF_OFFICE_ENDED = "scheduling.out_of_office.ended"
    end
  end
end
