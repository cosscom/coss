# frozen_string_literal: true

require "test_helper"

class MessageMapperTest < Minitest::Test
  include CossTestHelpers

  def test_raw_messages_are_decoded
    mail = Mail.new(<<~MAIL.gsub("\n", "\r\n"))
      From: =?UTF-8?B?Wm/Dqw==?= <z@example.com>
      To: =?ISO-8859-1?Q?Andr=E9?= <andre@example.com>
      Subject: =?UTF-8?B?R3LDvMOfZQ==?=
      X-Folded: one
       two
      Content-Type: text/plain; charset=ISO-8859-1
      Content-Transfer-Encoding: quoted-printable

      h=E9llo
    MAIL

    assert_equal(
      { "from" => "Zoë <z@example.com>", "to" => ["André <andre@example.com>"], "subject" => "Grüße",
        "text" => "héllo\r\n", "headers" => { "X-Folded" => "one two" } },
      request(mail)
    )
  end

  def test_a_single_html_part
    mail = base_mail
    mail.content_type = "text/html; charset=UTF-8"
    mail.body = "<p>Hi</p>"

    assert_equal "<p>Hi</p>", request(mail)["html"]
    refute request(mail).key?("text")
  end

  def test_empty_bodies_are_left_out
    mail = base_mail
    mail.body = ""

    refute request(mail).key?("text")
  end

  def test_mixed_related_alternative
    mail = base_mail
    mixed = mail
    related = Mail::Part.new(content_type: "multipart/related")
    alternative = Mail::Part.new(content_type: "multipart/alternative")
    alternative.add_part(Mail::Part.new(content_type: "text/plain; charset=UTF-8", body: "Hi"))
    alternative.add_part(Mail::Part.new(content_type: "text/html; charset=UTF-8", body: "<p>Hi</p>"))
    related.add_part(alternative)
    logo = Mail::Part.new(content_type: "image/png", content_id: "<logo@acme>", body: "PNG")
    related.add_part(logo)
    mixed.add_part(related)
    mixed.add_file(filename: "a.pdf", content: "%PDF")

    body = request(mail)

    assert_equal "Hi", body["text"]
    assert_equal "<p>Hi</p>", body["html"]
    assert_equal(
      [{ "filename" => "attachment-1", "content" => "UE5H", "content_type" => "image/png",
         "content_id" => "logo@acme" },
       { "filename" => "a.pdf", "content" => "JVBERg==", "content_type" => "application/pdf" }],
      body["attachments"]
    )
  end

  def test_an_inline_attachment_without_a_content_id_gets_one
    mail = base_mail
    mail.attachments.inline["logo.png"] = { mime_type: "image/png", content: "PNG" }

    content_id = request(mail)["attachments"].first["content_id"]

    assert_match(/\A[^<>]+@[^<>]+\z/, content_id)
    assert_equal "<#{content_id}>", mail.attachments["logo.png"].content_id
  end

  def test_attachment_bytes_are_not_transcoded
    mail = base_mail
    mail.attachments["latin1.txt"] = { mime_type: "text/plain; charset=ISO-8859-1", content: "caf\xE9".b }

    assert_equal Base64.strict_encode64("caf\xE9".b), request(mail)["attachments"].first["content"]
  end

  def test_a_second_html_part_is_refused
    mail = base_mail
    mail.add_part(Mail::Part.new(content_type: "text/html", body: "<p>One</p>"))
    mail.add_part(Mail::Part.new(content_type: "text/html", body: "<p>Two</p>"))

    assert_refused(mail, "second text/html")
  end

  def test_a_calendar_alternative_is_refused
    mail = base_mail
    mail.add_part(Mail::Part.new(content_type: "text/plain", body: "Hi"))
    mail.add_part(Mail::Part.new(content_type: "text/calendar; method=REQUEST", body: "BEGIN:VCALENDAR"))

    assert_refused(mail, "text/calendar")
  end

  def test_a_calendar_attachment_is_fine
    mail = base_mail
    mail.attachments["invite.ics"] = { mime_type: "text/calendar", content: "BEGIN:VCALENDAR" }

    assert_equal "text/calendar", request(mail)["attachments"].first["content_type"]
  end

  def test_a_message_without_from_is_refused
    mail = Mail.new(to: "ada@example.com", subject: "Hi", body: "Hi")

    assert_refused(mail, "no From")
  end

  def test_two_from_addresses_are_refused
    mail = base_mail
    mail.from = ["one@acme.test", "two@acme.test"]

    assert_refused(mail, "more than one From")
  end

  def test_a_sender_header_is_refused
    mail = base_mail
    mail.sender = "bounces@acme.test"

    assert_refused(mail, "Sender")
  end

  def test_text_in_another_encoding_is_transcoded
    mail = base_mail
    mail.subject = "café".encode("ISO-8859-1")
    mail.body = "Grüße".encode("ISO-8859-1")
    mail["X-Note"] = "naïve".encode("ISO-8859-1")
    body = request(mail)

    assert_equal "café", body["subject"]
    assert_equal "Grüße", body["text"]
    assert_equal({ "X-Note" => Coss::Rails::Mime.encode_header_value("naïve") }, body["headers"])
  end

  def test_binary_strings_are_read_as_utf8
    assert_equal "café", Coss::Rails::Mime.utf8("café".b)
    assert_equal "caf\uFFFD", Coss::Rails::Mime.utf8("caf\xE9".b)
  end

  def test_a_message_without_a_to_address_is_refused
    mail = Mail.new(from: "hello@acme.test", bcc: "hidden@example.com", subject: "Hi", body: "Hi")

    assert_refused(mail, "without a To address")
  end

  def test_a_multipart_attachment_is_refused
    mail = base_mail
    mail.html_part = Mail::Part.new(content_type: "text/html; charset=UTF-8", body: "<p>Hi</p>")
    bundle = Mail::Part.new(content_type: "multipart/mixed", content_disposition: 'attachment; filename="bundle"')
    bundle.add_part(Mail::Part.new(content_type: "text/plain; charset=UTF-8", body: "inside the attachment"))
    mail.add_part(bundle)

    assert_refused(mail, "multipart attachment")
  end

  def test_a_sender_naming_the_from_address_is_dropped
    mail = base_mail
    mail.body = "Hi"
    mail.sender = "Hello@Acme.test"

    assert_nil request(mail)["headers"]
  end

  def test_the_message_id_and_top_level_content_id_are_not_sent
    mail = base_mail
    mail.message_id = "<custom@acme.test>"
    mail.content_id = "<top@acme.test>"
    mail["In-Reply-To"] = "<earlier@acme.test>"

    assert_equal({ "In-Reply-To" => "<earlier@acme.test>" }, request(mail)["headers"])
  end

  def test_header_names_are_kept_as_given
    mail = base_mail
    mail["x-lower-case"] = "yes"
    mail["List-Unsubscribe"] = "<https://acme.test/u>"

    assert_equal({ "x-lower-case" => "yes", "List-Unsubscribe" => "<https://acme.test/u>" }, request(mail)["headers"])
  end

  def test_a_header_given_twice_in_different_case_is_refused
    mail = base_mail
    mail["X-Dup"] = "one"
    mail["x-dup"] = "two"

    assert_refused(mail, "more than once")
  end

  def test_coss_options_on_the_message
    mail = base_mail
    mail.coss_options = {
      tags: [{ name: "plan", value: "pro" }, { "name" => "order", "value" => 42 }],
      scheduled_at: DateTime.new(2026, 11, 1, 10, 0, 30.5, "+01:00")
    }

    body = request(mail)

    assert_equal [{ "name" => "plan", "value" => "pro" }, { "name" => "order", "value" => "42" }], body["tags"]
    assert_equal "2026-11-01T09:00:30Z", body["scheduled_at"]
  end

  def test_scheduled_at_strings_are_sent_as_given
    mail = base_mail
    mail.coss_options = { scheduled_at: "2026-11-01T10:00:00+01:00" }

    assert_equal "2026-11-01T10:00:00+01:00", request(mail)["scheduled_at"]
  end

  def test_invalid_coss_options_raise
    mail = base_mail

    assert_raises(ArgumentError) { mail.coss_options = { colour: "red" } }
    assert_raises(ArgumentError) { mail.coss_options = { tags: "plan=pro" } }
    assert_raises(ArgumentError) { mail.coss_options = { tags: [{ name: "plan" }] } }
    assert_raises(ArgumentError) { mail.coss_options = { scheduled_at: Date.new(2026, 11, 1) } }
    assert_raises(ArgumentError) { mail.coss_options = { tracking: true } }
    assert_raises(ArgumentError) { mail.coss_options = { category: 42 } }
  end

  private

  def base_mail
    Mail.new(from: "hello@acme.test", to: "ada@example.com", subject: "Hello", charset: "UTF-8")
  end

  def request(mail)
    Coss::Rails::MessageMapper.new(mail).to_request.first
  end

  def assert_refused(mail, fragment)
    error = assert_raises(Coss::Rails::UnsupportedMessageError) { request(mail) }

    assert_includes error.message, fragment
  end
end
