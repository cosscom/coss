# frozen_string_literal: true

module Coss
  module Rails
    # Adds coss.com's accessors to `Mail::Message`.
    module MessageExtension
      # The email as the coss.com API returned it (a Hash: `"id" => "email_…"`, `"status"`, …),
      # set once the message is delivered.
      attr_accessor :coss_email

      # coss.com's fields for this message (`category`, `tags`, `scheduled_at`, `tracking`,
      # `idempotency_key`), normally set with `coss(...)` in a mailer action.
      def coss_options
        @coss_options ||= {}
      end

      def coss_options=(options)
        @coss_options = options.nil? ? {} : Options.normalize(options)
      end
    end

    ::Mail::Message.include(MessageExtension)
  end
end
