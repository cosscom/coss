# frozen_string_literal: true

# Hand-written (listed in .fernignore): integrations/conformance/webhooks.json, the cases every
# coss.com SDK runs.

require "json"
require_relative "../test_helper"
require "minitest/autorun"

class WebhooksConformanceTest < Minitest::Test
  FIXTURE = JSON.parse(File.read(File.expand_path("../../../../integrations/conformance/webhooks.json", __dir__)))

  FIXTURE["cases"].each do |c|
    define_method("test_#{c["name"].gsub(/\W+/, "_")}") do
      settings = FIXTURE.merge(c.slice("secret", "now", "tolerance_seconds"))
      run = -> do
        method = c["kind"] == "log_drain" ? :verify_log_drain_batch : :verify
        Coss::Webhooks.public_send(
          method, c["payload"], c["headers"], settings["secret"],
          tolerance: settings["tolerance_seconds"], now: Time.at(settings["now"])
        )
      end
      if c["expect"].key?("error")
        error = assert_raises(Coss::WebhookVerificationError) { run.call }
        assert_equal c["expect"]["error"], error.message
      else
        assert_equal c["expect"]["value"], run.call
      end
    end
  end

  def test_rack_env_and_header_objects
    c = FIXTURE["cases"].first
    env = c["headers"].to_h { |name, value| ["HTTP_#{name.upcase.tr("-", "_")}", value] }
    now = Time.at(FIXTURE["now"])

    assert_equal c["expect"]["value"], Coss::Webhooks.verify(c["payload"], env, FIXTURE["secret"], now: now)
    headers = Object.new
    headers.define_singleton_method(:[]) { |name| c["headers"][name.downcase] }

    assert_equal c["expect"]["value"], Coss::Webhooks.verify(c["payload"], headers, FIXTURE["secret"], now: now)
  end

  def test_rejects_bytes_that_arent_utf8
    key = FIXTURE["secret"].delete_prefix("whsec_").unpack1("m0")
    body = "{\"type\": \"\xFF\"}".b
    signature = [OpenSSL::HMAC.digest("SHA256", key, "msg_1.#{FIXTURE["now"]}.".b + body)].pack("m0")
    headers = { "webhook-id" => "msg_1", "webhook-timestamp" => FIXTURE["now"].to_s, "webhook-signature" => "v1,#{signature}" }
    now = Time.at(FIXTURE["now"])

    error = assert_raises(Coss::WebhookVerificationError) { Coss::Webhooks.verify(body, headers, FIXTURE["secret"], now: now) }
    assert_equal "The webhook body is not valid JSON.", error.message
    error = assert_raises(Coss::WebhookVerificationError) do
      Coss::Webhooks.verify_log_drain_batch(body, headers, FIXTURE["secret"], now: now)
    end
    assert_equal "The log drain body is not valid NDJSON.", error.message
  end
end
