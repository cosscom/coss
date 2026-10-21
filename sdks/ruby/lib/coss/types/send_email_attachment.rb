# frozen_string_literal: true

module Coss
  module Types
    class SendEmailAttachment < Internal::Types::Model
      field :filename, -> { String }, optional: false, nullable: false

      field :content, -> { String }, optional: false, nullable: false

      field :content_type, -> { String }, optional: true, nullable: false

      field :content_id, -> { String }, optional: true, nullable: false
    end
  end
end
