# frozen_string_literal: true

module Coss
  module Types
    # The DMARC record found at `_dmarc.<domain>` by the latest DNS check.
    class DmarcPublishedRecord < Internal::Types::Model
      field :value, -> { String }, optional: false, nullable: false

      field :p, -> { Coss::Types::DmarcPublishedRecordP }, optional: false, nullable: true

      field :sp, -> { Coss::Types::DmarcPublishedRecordSp }, optional: false, nullable: true

      field :np, -> { Coss::Types::DmarcPublishedRecordNp }, optional: false, nullable: true

      field :adkim, -> { Coss::Types::DmarcPublishedRecordAdkim }, optional: false, nullable: true

      field :aspf, -> { Coss::Types::DmarcPublishedRecordAspf }, optional: false, nullable: true

      field :pct, -> { Integer }, optional: false, nullable: true

      field :t, -> { Coss::Types::DmarcPublishedRecordT }, optional: false, nullable: true

      field :rua, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
