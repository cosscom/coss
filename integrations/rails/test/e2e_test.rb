# frozen_string_literal: true

require "test_helper"
require "support/mailers"

# Against the API's test app: `bun run --cwd apps/api serve:test` prints the JSON to put in COSS_E2E.
class EndToEndTest < Minitest::Test
  include CossTestHelpers

  CONFIG = ENV["COSS_E2E"].to_s.empty? ? nil : JSON.parse(ENV.fetch("COSS_E2E"))

  def setup
    skip "set COSS_E2E to the JSON printed by `bun run --cwd apps/api serve:test`" unless CONFIG
    WebMock.allow_net_connect!
    @settings = ActionMailer::Base.coss_settings
  end

  def teardown
    ActionMailer::Base.coss_settings = @settings if @settings
    WebMock.disable_net_connect!
    super
  end

  def test_a_live_send_from_a_verified_domain
    mail = Mail.new(from: CONFIG["live_from"], to: "Ada Lovelace <ada@example.com>", subject: "Live from Rails ✓",
                    charset: "UTF-8")
    mail.text_part = Mail::Part.new(content_type: "text/plain; charset=UTF-8", body: "Hi Ada")
    mail.html_part = Mail::Part.new(content_type: "text/html; charset=UTF-8", body: "<p>Hi Ada</p>")
    mail.attachments["notes.txt"] = { mime_type: "text/plain", content: "héllo" }
    mail["X-Campaign"] = "e2e"
    mail.coss_options = { category: "receipts", tags: { plan: "pro" } }

    email = Coss::Rails::DeliveryMethod.new(api_key: CONFIG["live_key"], base_url: CONFIG["base_url"]).deliver!(mail)

    assert_match(/\Aemail_/, email["id"])
    assert_equal email, mail.coss_email
    sent = wait_until_sent(email["id"], CONFIG["live_key"])

    assert_equal ["Ada Lovelace <ada@example.com>"], sent["to"]
    assert_equal "Live from Rails ✓", sent["subject"]
    assert_equal "Hi Ada", sent["text"]
    assert_equal "<p>Hi Ada</p>", sent["html"]
    assert_equal([["notes.txt", "text/plain", "héllo".bytesize]],
                 sent["attachments"].map { |a| [a["filename"], a["content_type"], a["size"]] })
    assert_equal "e2e", sent["headers"]["x-campaign"]
    assert_equal "receipts", sent["category"]
    assert_equal [{ "name" => "plan", "value" => "pro" }], sent["tags"]
    refute sent["sandbox"]
  end

  def test_a_sandbox_send_through_a_mailer
    ActionMailer::Base.coss_settings = { api_key: CONFIG["sandbox_key"], base_url: CONFIG["base_url"] }
    order = rand(1_000_000)

    message = ReceiptMailer.receipt(order).deliver_now
    sent = wait_until_sent(message.coss_email["id"], CONFIG["sandbox_key"])

    assert sent["sandbox"]
    assert_equal ["Ada Lovelace <ada@example.com>"], sent["to"]
    assert_equal ["carol@example.com"], sent["cc"]
    assert_equal "Your receipt ✓", sent["subject"]
    assert_equal "Thanks for your order!", sent["text"]
    assert_equal([["logo.png", "image/png", "logo@acme"], ["receipt.pdf", "application/pdf", nil]],
                 sent["attachments"].map { |a| [a["filename"], a["content_type"], a["content_id"]] })
    assert_equal({ "x-campaign" => "spring", "x-greeting" => "=?UTF-8?B?R3LDvMOfZQ==?=" }, sent["headers"])
    assert_equal "receipts", sent["category"]
    assert_equal [{ "name" => "plan", "value" => "pro" }, { "name" => "order", "value" => order.to_s }], sent["tags"]

    # The idempotency key (`order-<id>`) makes a second delivery return the same email.
    again = ReceiptMailer.receipt(order).deliver_now

    assert_equal message.coss_email["id"], again.coss_email["id"]
  end

  def test_a_live_send_from_an_unverified_domain_is_refused
    mail = Mail.new(from: "hello@unverified-#{rand(1_000_000)}.test", to: "ada@example.com", subject: "Nope",
                    body: "Nope")

    error = assert_raises(Coss::Rails::DeliveryError) do
      Coss::Rails::DeliveryMethod.new(api_key: CONFIG["live_key"], base_url: CONFIG["base_url"]).deliver!(mail)
    end

    assert_equal "domain_not_verified", error.code
    assert_match(/\Areq_/, error.request_id)
    assert_kind_of Integer, error.status
  end

  private

  def wait_until_sent(id, key)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + 10
    loop do
      email = get_email(id, key)
      return email if email["status"] == "sent"

      flunk "#{id} is still #{email['status']} after 10 s" if Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline
      sleep 0.2
    end
  end

  def get_email(id, key)
    uri = URI("#{CONFIG['base_url']}/v1/emails/#{id}")
    request = Net::HTTP::Get.new(uri, "Authorization" => "Bearer #{key}", "Accept" => "application/json")
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(request) }

    assert_equal "200", response.code, response.body
    JSON.parse(response.body)
  end
end
