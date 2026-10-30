# frozen_string_literal: true

module Coss
  module Forms
    module Types
      class UpdateFormRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :name, -> { String }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :fields, -> { Internal::Types::Array[Coss::Types::FormFieldInput] }, optional: true, nullable: false

        field :strict_fields, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :allowed_origins, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :redirect_url, -> { String }, optional: true, nullable: false

        field :spam, -> { Coss::Forms::Types::UpdateFormRequestSpam }, optional: true, nullable: false

        field :submitter, -> { Coss::Forms::Types::UpdateFormRequestSubmitter }, optional: true, nullable: false

        field :notifications, -> { Coss::Forms::Types::UpdateFormRequestNotifications }, optional: true, nullable: false

        field :contacts, -> { Coss::Forms::Types::UpdateFormRequestContacts }, optional: true, nullable: false

        field :files, -> { Coss::Forms::Types::UpdateFormRequestFiles }, optional: true, nullable: false

        field :hosted, -> { Coss::Forms::Types::UpdateFormRequestHosted }, optional: true, nullable: false
      end
    end
  end
end
