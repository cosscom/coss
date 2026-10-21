# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEvent < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::BillingWebhookEventZero }

      member -> { Coss::Types::BillingWebhookEventOne }

      member -> { Coss::Types::BillingWebhookEventTwo }

      member -> { Coss::Types::BillingWebhookEventThree }

      member -> { Coss::Types::BillingWebhookEventFour }

      member -> { Coss::Types::BillingWebhookEventFive }
    end
  end
end
