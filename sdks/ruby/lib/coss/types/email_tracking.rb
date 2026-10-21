# frozen_string_literal: true

module Coss
  module Types
    # Open and click tracking, as resolved when the email was sent, with engagement so far. Opens can be inflated by
    # mail clients that prefetch images, clicks by link scanners.
    class EmailTracking < Internal::Types::Model
      field :opens, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :clicks, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :unsubscribe, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :open_count, -> { Integer }, optional: false, nullable: false

      field :first_opened_at, -> { String }, optional: false, nullable: true

      field :last_opened_at, -> { String }, optional: false, nullable: true

      field :click_count, -> { Integer }, optional: false, nullable: false

      field :first_clicked_at, -> { String }, optional: false, nullable: true

      field :last_clicked_at, -> { String }, optional: false, nullable: true
    end
  end
end
