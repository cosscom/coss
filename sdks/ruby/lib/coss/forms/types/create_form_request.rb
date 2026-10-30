# frozen_string_literal: true

module Coss
  module Forms
    module Types
      class CreateFormRequest < Internal::Types::Model
        field :name, -> { String }, optional: false, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :fields, -> { Internal::Types::Array[Coss::Types::FormFieldInput] }, optional: true, nullable: false

        field :strict_fields, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :allowed_origins, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :redirect_url, -> { String }, optional: true, nullable: false

        field :spam, -> { Coss::Forms::Types::CreateFormRequestSpam }, optional: true, nullable: false

        field :submitter, -> { Coss::Forms::Types::CreateFormRequestSubmitter }, optional: true, nullable: false

        field :notifications, -> { Coss::Forms::Types::CreateFormRequestNotifications }, optional: true, nullable: false

        field :contacts, -> { Coss::Forms::Types::CreateFormRequestContacts }, optional: true, nullable: false

        field :files, -> { Coss::Forms::Types::CreateFormRequestFiles }, optional: true, nullable: false

        field :hosted, -> { Coss::Forms::Types::CreateFormRequestHosted }, optional: true, nullable: false
      end
    end
  end
end
