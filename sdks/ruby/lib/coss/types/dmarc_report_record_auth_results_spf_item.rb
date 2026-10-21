# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportRecordAuthResultsSpfItem < Internal::Types::Model
      field :domain, -> { String }, optional: false, nullable: false

      field :scope, -> { String }, optional: false, nullable: true

      field :result, -> { String }, optional: false, nullable: false
    end
  end
end
