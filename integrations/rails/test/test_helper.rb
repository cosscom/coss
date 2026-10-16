# frozen_string_literal: true

require "base64"
require "json"
require "logger"

require "rails"
require "action_mailer/railtie"
require "active_job/railtie"
require "coss-rails"

require "minitest/autorun"
require "webmock/minitest"

# A minimal Rails app, so the Railtie registers `:coss` the way it does in a real one.
class CossRailsTestApp < Rails::Application
  config.root = __dir__
  config.eager_load = false
  config.logger = Logger.new(nil)
  config.secret_key_base = "coss-rails-test-#{'x' * 48}"
  config.active_job.queue_adapter = :inline
  config.action_mailer.delivery_method = :coss
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.coss_settings = { api_key: "coss_test_railtie", base_url: "https://api.coss.test" }
end
CossRailsTestApp.initialize!

module CossTestHelpers
  CONFORMANCE = File.expand_path("../../conformance", __dir__)
  API_URL = "https://api.coss.test/v1/emails"

  def self.conformance(name)
    JSON.parse(File.read(File.join(CONFORMANCE, "#{name}.json")))
  end

  # A `Mail::Address` string for `{ "address" => …, "name" => … }`.
  def mail_address(entry)
    address = Mail::Address.new
    address.address = entry["address"]
    address.display_name = entry["name"] if entry["name"]
    address.to_s
  end

  # Builds a `Mail::Message` from one of message.json's `input`s.
  def build_mail(input)
    mail = Mail.new
    mail.charset = "UTF-8"
    mail[:from] = mail_address(input["from"])
    %w[to cc bcc reply_to].each do |field|
      mail[field.to_sym] = input[field].map { |entry| mail_address(entry) }.join(", ") if input[field]
    end
    mail.subject = input["subject"]
    add_bodies(mail, input)
    (input["attachments"] || []).each { |attachment| add_attachment(mail, attachment) }
    (input["headers"] || {}).each { |name, value| mail[name] = value }
    mail.coss_options = input["coss"] if input["coss"]
    mail
  end

  def add_bodies(mail, input)
    if input["html"]
      alternative = Mail::Part.new(content_type: "multipart/alternative")
      alternative.add_part(Mail::Part.new(content_type: "text/plain; charset=UTF-8", body: input["text"]))
      alternative.add_part(Mail::Part.new(content_type: "text/html; charset=UTF-8", body: input["html"]))
      mail.add_part(alternative)
    else
      mail.content_type = "text/plain; charset=UTF-8"
      mail.body = input["text"]
    end
  end

  def add_attachment(mail, attachment)
    file = { mime_type: attachment["content_type"], content: Base64.strict_decode64(attachment["content_base64"]) }
    if attachment["inline"]
      mail.attachments.inline[attachment["filename"]] = file
      mail.attachments[attachment["filename"]].content_id = "<#{attachment['content_id']}>"
    else
      mail.attachments[attachment["filename"]] = file
    end
  end

  # Records every request WebMock sees (once per attempt).
  def record_requests
    requests = []
    WebMock.after_request { |request, _response| requests << request }
    requests
  end

  def downcase_headers(headers)
    headers.to_h { |name, value| [name.to_s.downcase, value] }
  end

  def email_response(id = "email_01k0000000000000000000000")
    { status: 202, headers: { "Content-Type" => "application/json" },
      body: JSON.generate({ "object" => "email", "id" => id, "status" => "queued" }) }
  end

  def teardown
    WebMock::CallbackRegistry.reset
    super
  end
end
