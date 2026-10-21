# frozen_string_literal: true

module Coss
  module Types
    # Your organization's dedicated IPs (the Dedicated IPs add-on): a pool managed and warmed up automatically.
    class DedicatedIPPool < Internal::Types::Model
      field :object, -> { Coss::Types::DedicatedIPPoolObject }, optional: false, nullable: false

      field :status, -> { Coss::Types::DedicatedIPPoolStatus }, optional: false, nullable: false

      field :ips, -> { Internal::Types::Array[Coss::Types::DedicatedIPPoolIpsItem] }, optional: false, nullable: false

      field :dedicated_share, -> { Integer }, optional: false, nullable: true

      field :message, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: true

      field :ready_at, -> { String }, optional: false, nullable: true
    end
  end
end
