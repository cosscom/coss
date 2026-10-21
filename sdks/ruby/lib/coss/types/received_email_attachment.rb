# frozen_string_literal: true

module Coss
  module Types
    class ReceivedEmailAttachment < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :filename, -> { String }, optional: false, nullable: true

      field :content_type, -> { String }, optional: false, nullable: false

      field :content_id, -> { String }, optional: false, nullable: true

      field :disposition, -> { Coss::Types::ReceivedEmailAttachmentDisposition }, optional: false, nullable: false

      field :size, -> { Integer }, optional: false, nullable: false
    end
  end
end
