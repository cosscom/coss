# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportList < Internal::Types::Model
      field :object, -> { Coss::Types::DmarcReportListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::DmarcReportSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
