# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportRecord < Internal::Types::Model
      field :source_ip, -> { String }, optional: false, nullable: false

      field :count, -> { Integer }, optional: false, nullable: false

      field :disposition, -> { Coss::Types::DmarcReportRecordDisposition }, optional: false, nullable: false

      field :dkim, -> { Coss::Types::DmarcReportRecordDkim }, optional: false, nullable: false

      field :spf, -> { Coss::Types::DmarcReportRecordSpf }, optional: false, nullable: false

      field :dmarc_pass, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :header_from, -> { String }, optional: false, nullable: false

      field :envelope_from, -> { String }, optional: false, nullable: true

      field :via_coss, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :auth_results, -> { Coss::Types::DmarcReportRecordAuthResults }, optional: false, nullable: false

      field :reasons, -> { Internal::Types::Array[Coss::Types::DmarcReportRecordReasonsItem] }, optional: false, nullable: false
    end
  end
end
