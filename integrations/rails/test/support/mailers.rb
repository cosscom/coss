# frozen_string_literal: true

LOGO_PNG = Base64.strict_decode64("iVBORw0KGgo=")

class ReceiptMailer < ActionMailer::Base
  default from: '"Acme, Inc." <hello@acme.test>'

  def receipt(order_id, scheduled_at = nil)
    coss category: "receipts", tags: { plan: "pro", order: order_id },
         tracking: { opens: true, clicks: false }, idempotency_key: "order-#{order_id}"
    coss scheduled_at: Time.zone.parse(scheduled_at) if scheduled_at
    headers["X-Campaign"] = "spring"
    headers["X-Greeting"] = "Grüße"
    attachments["receipt.pdf"] = { mime_type: "application/pdf", content: "%PDF-1.4\n" }
    attachments.inline["logo.png"] = { mime_type: "image/png", content: LOGO_PNG, content_id: "<logo@acme>" }
    mail(to: "Ada Lovelace <ada@example.com>", cc: "carol@example.com", bcc: "Dan <dan@example.com>",
         reply_to: "support@acme.test", subject: "Your receipt ✓") do |format|
      format.text { render plain: "Thanks for your order!" }
      format.html { render html: %(<p>Thanks! <img src="#{attachments['logo.png'].url}"></p>).html_safe }
    end
  end

  def plain(**headers)
    mail({ to: "ada@example.com", subject: "Hello", body: "Hi Ada", content_type: "text/plain" }.merge(headers))
  end

  def with_envelope_to(addresses)
    message.smtp_envelope_to = addresses
    mail(to: "ada@example.com", subject: "Hello", body: "Hi Ada")
  end

  def with_envelope_from(address)
    message.smtp_envelope_from = address
    mail(to: "ada@example.com", subject: "Hello", body: "Hi Ada")
  end

  def duplicate_header
    headers["X-Dup"] = "one"
    headers["X-Dup"] = "two"
    mail(to: "ada@example.com", subject: "Hello", body: "Hi Ada")
  end

  def multi_valued_header
    headers["X-List"] = %w[one two]
    mail(to: "ada@example.com", subject: "Hello", body: "Hi Ada")
  end

  def with_bad_coss_option
    coss(category: "x", colour: "red")
    mail(to: "ada@example.com", subject: "Hello", body: "Hi Ada")
  end
end
