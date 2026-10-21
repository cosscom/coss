# frozen_string_literal: true

module Coss
  module Domains
    module Dmarc
      module Reports
        module Types
          class GetReportsRequest < Internal::Types::Model
            field :id, -> { String }, optional: false, nullable: false

            field :report_id, -> { String }, optional: false, nullable: false
          end
        end
      end
    end
  end
end
