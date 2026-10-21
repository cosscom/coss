# frozen_string_literal: true

module Coss
  module Types
    # The DNS record to publish, with the result of the last check.
    class TrackingDomainRecord < Internal::Types::Model
      field :type, -> { Coss::Types::TrackingDomainRecordType }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::TrackingDomainRecordStatus }, optional: false, nullable: false

      field :found, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
