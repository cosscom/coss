# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportRecordReasonsItem < Internal::Types::Model
      field :type, -> { String }, optional: false, nullable: false

      field :comment, -> { String }, optional: false, nullable: true
    end
  end
end
