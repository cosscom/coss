"""coss-django: a Django email backend that sends through the coss.com API.

    EMAIL_BACKEND = "coss_django.EmailBackend"
    COSS_API_KEY = "coss_live_…"  # or the COSS_API_KEY environment variable

Docs: https://coss.com/docs/integrations/django
"""

__version__ = "0.1.0"

from coss_django.backend import EmailBackend  # noqa: E402
from coss_django.client import CossError  # noqa: E402

__all__ = ["CossError", "EmailBackend", "__version__"]
