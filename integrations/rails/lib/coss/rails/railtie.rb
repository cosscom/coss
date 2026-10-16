# frozen_string_literal: true

module Coss
  module Rails
    # Registers `:coss` before Action Mailer applies `config.action_mailer.*`, so
    # `config.action_mailer.coss_settings = { ... }` has somewhere to go.
    class Railtie < ::Rails::Railtie
      initializer "coss_rails.add_delivery_method", before: "action_mailer.set_configs" do
        ActiveSupport.on_load(:action_mailer) { Coss::Rails.install(self) }
      end
    end
  end
end
