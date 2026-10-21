# frozen_string_literal: true

module Coss
  module Types
    class Email < Internal::Types::Model
      field :object, -> { Coss::Types::EmailObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :cc, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :bcc, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :reply_to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: false

      field :html, -> { String }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: true

      field :headers, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :tags, -> { Internal::Types::Array[Coss::Types::EmailTagsItem] }, optional: false, nullable: false

      field :category, -> { String }, optional: false, nullable: true

      field :stream, -> { Coss::Types::EmailStream }, optional: false, nullable: false

      field :status, -> { Coss::Types::EmailStatus }, optional: false, nullable: false

      field :failure, -> { Coss::Types::EmailFailure }, optional: false, nullable: true

      field :recipients, -> { Internal::Types::Array[Coss::Types::EmailRecipient] }, optional: false, nullable: false

      field :attachments, -> { Internal::Types::Array[Coss::Types::EmailAttachment] }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :tracking, -> { Coss::Types::EmailTracking }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :sent_at, -> { String }, optional: false, nullable: true

      field :scheduled_at, -> { String }, optional: false, nullable: true

      field :batch_id, -> { String }, optional: false, nullable: true

      field :template, -> { Coss::Types::EmailTemplateReference }, optional: false, nullable: true

      field :broadcast_id, -> { String }, optional: false, nullable: true

      field :content_storage, -> { Coss::Types::EmailContentStorage }, optional: false, nullable: false
    end
  end
end
