# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportRecordAuthResultsDkimItem < Internal::Types::Model
      field :domain, -> { String }, optional: false, nullable: false

      field :selector, -> { String }, optional: false, nullable: true

      field :result, -> { String }, optional: false, nullable: false
    end
  end
end
