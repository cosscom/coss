# frozen_string_literal: true

module Coss
  module Types
    # Whether coss.com keeps the email's content after sending it.
    class EmailContentStorage < Internal::Types::Model
      field :mode, -> { Coss::Types::EmailContentStorageMode }, optional: false, nullable: false

      field :discarded_at, -> { String }, optional: false, nullable: true
    end
  end
end
