# frozen_string_literal: true

module Coss
  module Rails
    # Adds `coss(...)` to Action Mailer mailers (the Railtie includes it into `ActionMailer::Base`).
    #
    #   class ReceiptMailer < ApplicationMailer
    #     def receipt(order)
    #       coss category: "receipts", tags: { plan: order.plan }, idempotency_key: "receipt-#{order.id}"
    #       mail to: order.email, subject: "Your receipt"
    #     end
    #   end
    #
    # The options are stored on the message (`message.coss_options`), so they survive
    # `deliver_later`: the job runs the action again.
    module Mailer
      # Sets coss.com's fields for the message this action builds. Calling it again merges: a
      # later call replaces the options it gives. Raises ArgumentError for invalid values.
      #
      # - `category`: what kind of email this is, e.g. `"marketing"`.
      # - `tags`: `{ plan: "pro" }` or `[{ name: "plan", value: "pro" }]`.
      # - `scheduled_at`: a Time, DateTime or ActiveSupport::TimeWithZone (sent as UTC), or an
      #   ISO 8601 String sent as given; at most 30 days ahead.
      # - `tracking`: `{ opens: true, clicks: false }`.
      # - `idempotency_key`: sent as `Idempotency-Key` (default: a random key per message).
      def coss(category: nil, tags: nil, scheduled_at: nil, tracking: nil, idempotency_key: nil)
        given = Options.normalize(
          category: category, tags: tags, scheduled_at: scheduled_at, tracking: tracking,
          idempotency_key: idempotency_key
        )
        message.coss_options = message.coss_options.merge(given)
      end
    end
  end
end
