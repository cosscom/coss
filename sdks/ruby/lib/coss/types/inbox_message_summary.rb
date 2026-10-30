# frozen_string_literal: true

module Coss
  module Types
    class InboxMessageSummary < Internal::Types::Model
      field :object, -> { Coss::Types::InboxMessageSummaryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :inbox_id, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false

      field :direction, -> { Coss::Types::InboxMessageSummaryDirection }, optional: false, nullable: false

      field :status, -> { Coss::Types::InboxMessageSummaryStatus }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: true

      field :to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :cc, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :preview, -> { String }, optional: false, nullable: true

      field :attachments, -> { Internal::Types::Array[Coss::Types::ReceivedEmailAttachment] }, optional: false, nullable: false

      field :spam, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :received_email_id, -> { String }, optional: false, nullable: true

      field :email_id, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
