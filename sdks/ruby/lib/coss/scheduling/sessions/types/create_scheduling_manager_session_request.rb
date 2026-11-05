# frozen_string_literal: true

module Coss
  module Scheduling
    module Sessions
      module Types
        class CreateSchedulingManagerSessionRequest < Internal::Types::Model
          field :hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :host_filter, -> { Internal::Types::Hash[String, Coss::Scheduling::Sessions::Types::CreateSchedulingManagerSessionRequestHostFilterValue] }, optional: true, nullable: false

          field :expires_in, -> { Integer }, optional: true, nullable: false

          field :read_only, -> { Internal::Types::Boolean }, optional: true, nullable: false
        end
      end
    end
  end
end
