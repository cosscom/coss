# Changelog

## 0.1.0

- Initial release: `coss_django.EmailBackend`, a Django email backend (Django 5.2–6.1) that sends
  each message through the coss.com API (`POST /v1/emails`), with retries, coss.com's own fields
  through `message.coss` and the sent email on `message.coss_email`.
