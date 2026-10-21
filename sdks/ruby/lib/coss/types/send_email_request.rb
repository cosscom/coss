# frozen_string_literal: true

module Coss
  module Types
    class SendEmailRequest < Internal::Types::Model
      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { Coss::Types::SendEmailRequestTo }, optional: false, nullable: false

      field :cc, -> { Coss::Types::SendEmailRequestCc }, optional: true, nullable: false

      field :bcc, -> { Coss::Types::SendEmailRequestBcc }, optional: true, nullable: false

      field :reply_to, -> { Coss::Types::SendEmailRequestReplyTo }, optional: true, nullable: false

      field :subject, -> { String }, optional: true, nullable: false

      field :html, -> { String }, optional: true, nullable: false

      field :text, -> { String }, optional: true, nullable: false

      field :template_id, -> { String }, optional: true, nullable: false

      field :template_version, -> { Integer }, optional: true, nullable: false

      field :locale, -> { String }, optional: true, nullable: false

      field :variables, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false

      field :headers, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

      field :tags, -> { Internal::Types::Array[Coss::Types::SendEmailRequestTagsItem] }, optional: true, nullable: false

      field :category, -> { String }, optional: true, nullable: false

      field :scheduled_at, -> { String }, optional: true, nullable: false

      field :attachments, -> { Internal::Types::Array[Coss::Types::SendEmailAttachment] }, optional: true, nullable: false

      field :tracking, -> { Coss::Types::TrackingOptions }, optional: true, nullable: false

      field :stream, -> { Coss::Types::SendEmailRequestStream }, optional: true, nullable: false
    end
  end
end
