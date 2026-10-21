# frozen_string_literal: true

module Coss
  module Types
    # The MX record to publish, with the result of the last check. Mail for the hostname is received as soon as it
    # reaches coss.com; the check only shows what DNS serves.
    class ReceivingDomainRecord < Internal::Types::Model
      field :type, -> { Coss::Types::ReceivingDomainRecordType }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false

      field :priority, -> { Integer }, optional: false, nullable: false

      field :status, -> { Coss::Types::ReceivingDomainRecordStatus }, optional: false, nullable: false

      field :found, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
