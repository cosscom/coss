# frozen_string_literal: true

module Coss
  module Types
    class EmailLink < Internal::Types::Model
      field :object, -> { Coss::Types::EmailLinkObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :email_id, -> { String }, optional: false, nullable: false

      field :position, -> { Integer }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :click_count, -> { Integer }, optional: false, nullable: false

      field :first_clicked_at, -> { String }, optional: false, nullable: true

      field :last_clicked_at, -> { String }, optional: false, nullable: true
    end
  end
end
