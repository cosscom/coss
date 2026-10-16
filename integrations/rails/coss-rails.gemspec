# frozen_string_literal: true

require_relative "lib/coss/rails/version"

Gem::Specification.new do |spec|
  spec.name = "coss-rails"
  spec.version = Coss::Rails::VERSION
  spec.authors = ["Cal.com, Inc."]
  spec.summary = "An Action Mailer delivery method that sends through the coss.com API."
  spec.description = "Send your Rails app's Action Mailer emails through coss.com by changing " \
                     "configuration, not call sites."
  spec.homepage = "https://coss.com/docs/integrations/rails"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.2"

  spec.metadata = {
    "homepage_uri" => spec.homepage,
    "source_code_uri" => "https://github.com/cosscom/coss/tree/main/integrations/rails",
    "changelog_uri" => "https://github.com/cosscom/coss/blob/main/integrations/rails/CHANGELOG.md",
    "bug_tracker_uri" => "https://github.com/cosscom/coss/issues",
    "rubygems_mfa_required" => "true"
  }

  spec.files = Dir["lib/**/*.rb", "LICENSE", "README.md", "CHANGELOG.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "actionmailer", ">= 7.2", "< 9"
  spec.add_dependency "railties", ">= 7.2", "< 9"
end
