# frozen_string_literal: true

module Coss
  module Types
    class FormSubmission < Internal::Types::Model
      field :object, -> { Coss::Types::FormSubmissionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :form_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::FormSubmissionStatus }, optional: false, nullable: false

      field :data, -> { Internal::Types::Hash[String, Coss::Types::FormSubmissionDataValue] }, optional: false, nullable: false

      field :submitter_email, -> { String }, optional: false, nullable: true

      field :files, -> { Internal::Types::Array[Coss::Types::FormSubmissionFile] }, optional: false, nullable: false

      field :spam_reason, -> { Coss::Types::FormSubmissionSpamReason }, optional: false, nullable: true

      field :risk, -> { Coss::Types::FormSubmissionRisk }, optional: false, nullable: true

      field :ip, -> { String }, optional: false, nullable: true

      field :user_agent, -> { String }, optional: false, nullable: true

      field :origin, -> { String }, optional: false, nullable: true

      field :referrer, -> { String }, optional: false, nullable: true

      field :confirmed_at, -> { String }, optional: false, nullable: true

      field :accepted_at, -> { String }, optional: false, nullable: true

      field :released_at, -> { String }, optional: false, nullable: true

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
