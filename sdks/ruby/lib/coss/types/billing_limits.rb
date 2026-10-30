# frozen_string_literal: true

module Coss
  module Types
    # Resource limits (`null`: unlimited).
    class BillingLimits < Internal::Types::Model
      field :domains, -> { Integer }, optional: false, nullable: true

      field :members, -> { Integer }, optional: false, nullable: true

      field :webhook_endpoints_per_environment, -> { Integer }, optional: false, nullable: true

      field :contacts_per_environment, -> { Integer }, optional: false, nullable: true

      field :inboxes, -> { Integer }, optional: false, nullable: true
    end
  end
end
