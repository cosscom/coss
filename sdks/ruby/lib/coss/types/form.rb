# frozen_string_literal: true

module Coss
  module Types
    class Form < Internal::Types::Model
      field :object, -> { Coss::Types::FormObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :endpoint, -> { String }, optional: false, nullable: false

      field :hosted_url, -> { String }, optional: false, nullable: true

      field :fields, -> { Internal::Types::Array[Coss::Types::FormField] }, optional: false, nullable: true

      field :strict_fields, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :allowed_origins, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :redirect_url, -> { String }, optional: false, nullable: true

      field :spam, -> { Coss::Types::FormSpam }, optional: false, nullable: false

      field :submitter, -> { Coss::Types::FormSubmitter }, optional: false, nullable: false

      field :notifications, -> { Coss::Types::FormNotifications }, optional: false, nullable: false

      field :contacts, -> { Coss::Types::FormContacts }, optional: false, nullable: false

      field :files, -> { Coss::Types::FormFiles }, optional: false, nullable: false

      field :hosted, -> { Coss::Types::FormHosted }, optional: false, nullable: false

      field :disabled_by_admin, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
