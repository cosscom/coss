# frozen_string_literal: true

require "mail"

require_relative "rails/version"
require_relative "rails/errors"
require_relative "rails/mime"
require_relative "rails/options"
require_relative "rails/client"
require_relative "rails/message"
require_relative "rails/message_mapper"
require_relative "rails/delivery_method"
require_relative "rails/mailer"

module Coss
  # Sends Action Mailer messages through the coss.com API (`POST /v1/emails`).
  #
  #   # config/environments/production.rb
  #   config.action_mailer.delivery_method = :coss
  #   config.action_mailer.coss_settings = { api_key: ENV["COSS_API_KEY"] }
  module Rails
    # Registers the `:coss` delivery method on `base` (normally `ActionMailer::Base`) and adds
    # `coss(...)` to its mailers. The Railtie calls this; call it yourself without Rails.
    def self.install(base)
      base.add_delivery_method(:coss, DeliveryMethod) unless base.delivery_methods.key?(:coss)
      base.include(Mailer) unless base < Mailer
      base
    end
  end
end

require_relative "rails/railtie" if defined?(Rails::Railtie)
