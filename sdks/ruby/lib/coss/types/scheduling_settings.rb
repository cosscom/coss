# frozen_string_literal: true

module Coss
  module Types
    class SchedulingSettings < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingSettingsObject }, optional: false, nullable: false

      field :allowed_origins, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :brand_name, -> { String }, optional: false, nullable: true

      field :accent_color, -> { String }, optional: false, nullable: true

      field :logo, -> { Coss::Types::SchedulingSettingsLogo }, optional: false, nullable: true

      field :privacy_url, -> { String }, optional: false, nullable: true

      field :email_from, -> { String }, optional: false, nullable: true

      field :sms_from, -> { String }, optional: false, nullable: true

      field :name_host_in_attendee_emails, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :host_reassignment, -> { Coss::Types::SchedulingSettingsHostReassignment }, optional: false, nullable: false

      field :out_of_office_reasons, -> { Internal::Types::Array[Coss::Types::SchedulingSettingsOutOfOfficeReasonsItem] }, optional: false, nullable: false

      field :calendar_failure_mode, -> { Coss::Types::SchedulingSettingsCalendarFailureMode }, optional: false, nullable: false

      field :notifications, -> { Internal::Types::Hash[String, Coss::Types::SchedulingSettingsNotificationsValue] }, optional: false, nullable: true

      field :email_reply_to, -> { String }, optional: false, nullable: true

      field :reminders, -> { Internal::Types::Array[Coss::Types::SchedulingReminder] }, optional: false, nullable: true
    end
  end
end
