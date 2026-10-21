# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class CreateRiskAssessmentRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :event, -> { Coss::Types::RiskEvent }, optional: false, nullable: false

        field :event_name, -> { String }, optional: true, nullable: false

        field :user, -> { Coss::Risk::Types::CreateRiskAssessmentRequestUser }, optional: true, nullable: false

        field :ip, -> { String }, optional: true, nullable: false

        field :user_agent, -> { String }, optional: true, nullable: false

        field :captcha, -> { Coss::Risk::Types::CreateRiskAssessmentRequestCaptcha }, optional: true, nullable: false

        field :checkout, -> { Coss::Types::RiskCheckoutRequest }, optional: true, nullable: false

        field :device, -> { Coss::Risk::Types::CreateRiskAssessmentRequestDevice }, optional: true, nullable: false

        field :content, -> { Coss::Risk::Types::CreateRiskAssessmentRequestContent }, optional: true, nullable: false
      end
    end
  end
end
