# frozen_string_literal: true

module Coss
  module Types
    class DmarcReportReporter < Internal::Types::Model
      field :org_name, -> { String }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: true
    end
  end
end
