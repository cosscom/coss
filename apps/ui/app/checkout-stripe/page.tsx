"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  LockIcon,
  TagIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/registry/default/ui/button";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Form } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Separator } from "@/registry/default/ui/separator";
import { Spinner } from "@/registry/default/ui/spinner";

const countryOptions = [
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "GB" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Australia", value: "AU" },
  { label: "Japan", value: "JP" },
  { label: "Netherlands", value: "NL" },
  { label: "Spain", value: "ES" },
  { label: "Italy", value: "IT" },
];

const orderItems = [
  {
    id: "pure-glow",
    image: "https://placehold.co/48x48/e2e8f0/64748b?text=PG",
    name: "Pure Glow Cream",
    price: 32.0,
    quantity: 1,
  },
];

const promoCode = { code: "SAVE10", discount: 0.1 };

function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.72 8.2c-.1.08-1.86 1.07-1.86 3.28 0 2.56 2.25 3.46 2.31 3.48-.01.06-.36 1.24-1.18 2.45-.74 1.07-1.51 2.13-2.69 2.13s-1.48-.68-2.83-.68c-1.32 0-1.79.7-2.87.7s-1.81-.98-2.67-2.18C4.81 15.82 4 13.22 4 10.76c0-3.94 2.56-6.03 5.08-6.03 1.34 0 2.45.88 3.29.88.8 0 2.05-.93 3.59-.93.58 0 2.66.05 4.03 2.01l-.27.51zM14.18 3.18c.54-.65.93-1.55.93-2.45 0-.13-.01-.25-.04-.35-.89.03-1.94.59-2.58 1.33-.5.57-.97 1.47-.97 2.39 0 .14.02.28.04.32.06.01.17.03.27.03.8 0 1.79-.53 2.35-1.27z" />
    </svg>
  );
}

function VisaIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#1434CB" height="32" rx="4" width="32" />
      <path
        d="M13.823 21.25H11.349L12.89 10.75H15.364L13.823 21.25ZM9.456 10.75L7.099 17.955L6.82 16.555L6.82 16.556L5.989 11.573C5.989 11.573 5.889 10.75 4.848 10.75H1.042L1 10.892C1 10.892 2.162 11.138 3.524 11.938L5.67 21.25H8.254L12.138 10.75H9.456ZM28.5 21.25H30.75L28.785 10.75H26.785C25.893 10.75 25.678 11.429 25.678 11.429L21.893 21.25H24.478L24.994 19.821H28.138L28.5 21.25ZM25.714 17.821L27.071 13.964L27.821 17.821H25.714ZM22.178 13.571L22.535 11.321C22.535 11.321 21.464 10.893 20.357 10.893C19.143 10.893 16.25 11.429 16.25 14.036C16.25 16.5 19.678 16.536 19.678 17.821C19.678 19.107 16.607 18.786 15.607 17.964L15.214 20.321C15.214 20.321 16.321 20.857 18.036 20.857C19.75 20.857 22.143 19.929 22.143 17.536C22.143 15.036 18.678 14.786 18.678 13.75C18.678 12.714 21.107 12.893 22.178 13.571Z"
        fill="white"
      />
    </svg>
  );
}

function MastercardIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#000" height="32" rx="4" width="32" />
      <circle cx="12" cy="16" fill="#EB001B" r="7" />
      <circle cx="20" cy="16" fill="#F79E1B" r="7" />
      <path
        d="M16 10.5C17.38 11.64 18.25 13.38 18.25 15.31C18.25 15.54 18.23 15.77 18.2 16C18.23 16.23 18.25 16.46 18.25 16.69C18.25 18.62 17.38 20.36 16 21.5C14.62 20.36 13.75 18.62 13.75 16.69C13.75 16.46 13.77 16.23 13.8 16C13.77 15.77 13.75 15.54 13.75 15.31C13.75 13.38 14.62 11.64 16 10.5Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function AmexIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#006FCF" height="32" rx="4" width="32" />
      <path
        d="M5 16.5L6.5 12H8.5L10 16.5V12H13L14 15L15 12H18V20H15.5L14 16.5L12.5 20H10V15.5L8.5 20H6.5L5 16.5ZM19 12H27L28 13.5V14.5H25V15.5H28V16.5H25V17.5H28V18.5L27 20H19V12Z"
        fill="white"
      />
    </svg>
  );
}

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Stripe"
      className={className}
      fill="currentColor"
      viewBox="0 0 60 25"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.3 10.3 0 0 1-4.56.95c-4.01 0-6.83-2.5-6.83-7.28 0-4.19 2.39-7.36 6.42-7.36 3.94 0 5.78 2.91 5.78 6.94v1.83zm-5.78-5.63c-1.26 0-2.06.94-2.21 2.39h4.34c-.1-1.45-.82-2.39-2.13-2.39zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.24 0 5.06-2.7 7.76-5.65 7.76zm-.95-11.58c-.84 0-1.42.26-1.96.72v5.5c.5.4 1.04.7 1.96.7 1.52 0 2.54-1.5 2.54-3.5 0-1.98-1.04-3.42-2.54-3.42zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-5.57h4.13v3.57h-4.13V0zM20.24 5.57l.1 1.4c.9-1.1 2.2-1.66 3.6-1.66v3.88c-.3-.05-.62-.1-.96-.1-1.04 0-2.1.37-2.74 1.08v9.84h-4.13V5.57h4.13zM10.7 8.75c0-.7.6-1.02 1.5-1.02 1.32 0 2.98.4 4.3 1.12V5.2a11.35 11.35 0 0 0-4.3-.8c-3.52 0-5.86 1.84-5.86 4.9 0 4.78 6.56 4.01 6.56 6.07 0 .82-.72 1.1-1.72 1.1-1.49 0-3.4-.62-4.9-1.45v3.7c1.67.78 3.35 1.12 4.9 1.12 3.6 0 6.08-1.78 6.08-4.89 0-5.15-6.56-4.24-6.56-6.2z" />
    </svg>
  );
}

export default function StripeCheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);
  const [saveInfo, setSaveInfo] = useState(false);

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = subtotal * promoCode.discount;
  const total = subtotal - discount;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = matches?.[0] || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    }
    return value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)} / ${v.substring(2, 4)}`;
    }
    return v;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    alert("Payment successful! Thank you for your purchase.");
  };

  const handleApplePay = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    alert("Apple Pay payment successful! Thank you for your purchase.");
  };

  return (
    <main className="min-h-screen bg-[#f6f9fc] dark:bg-background">
      <div className="mx-auto grid min-h-screen max-w-5xl lg:grid-cols-[400px_1fr]">
        <div className="order-2 border-border/50 border-l bg-white p-8 lg:order-1 dark:bg-card">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
              P
            </div>
            <div>
              <h2 className="font-medium text-lg">Pay Powdur</h2>
              <p className="font-semibold text-2xl">${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {orderItems.map((item) => (
              <div className="flex items-center gap-3" key={item.id}>
                <img
                  alt={item.name}
                  className="size-12 rounded-md object-cover"
                  src={item.image}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                </div>
                <p className="font-medium text-sm">${item.price.toFixed(2)}</p>
              </div>
            ))}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TagIcon
                    aria-hidden="true"
                    className="size-4 text-green-600"
                  />
                  <span className="font-medium text-green-600">
                    {promoCode.code}
                  </span>
                </div>
                <span className="text-green-600">-${discount.toFixed(2)}</span>
              </div>
              <p className="text-muted-foreground text-xs">10% off</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-muted-foreground">
                  Enter address to calculate
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total due</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="order-1 p-8 lg:order-2">
          <Form onSubmit={onSubmit}>
            <div className="space-y-6">
              <Button
                className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                disabled={loading}
                onClick={handleApplePay}
                size="lg"
                type="button"
              >
                <ApplePayIcon className="size-5" />
                Pay
              </Button>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-muted-foreground text-xs uppercase">
                  Or
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-4">
                <h2 className="font-semibold">Shipping information</h2>

                <Field name="email">
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    disabled={loading}
                    placeholder="email@example.com"
                    required
                    type="email"
                  />
                </Field>

                <div className="space-y-2">
                  <Label className="font-medium text-sm">
                    Shipping address
                  </Label>
                  <div className="overflow-hidden rounded-md border">
                    <Input
                      className="rounded-none border-0 border-b"
                      disabled={loading}
                      placeholder="Full name"
                      required
                      type="text"
                    />
                    <Select defaultValue="US" items={countryOptions}>
                      <SelectTrigger className="rounded-none border-0 border-b">
                        <SelectValue />
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="ml-auto size-4 opacity-50"
                        />
                      </SelectTrigger>
                      <SelectPopup>
                        {countryOptions.map(({ label, value }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    <Input
                      className="rounded-none border-0"
                      disabled={loading}
                      placeholder="Address"
                      required
                      type="text"
                    />
                  </div>
                  <button
                    className="text-primary text-sm hover:underline"
                    type="button"
                  >
                    Enter address manually
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-semibold">Payment method</h2>

                <div className="overflow-hidden rounded-md border">
                  <button
                    className={`flex w-full items-center gap-3 border-b p-4 text-left ${selectedPaymentMethod === "card" ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedPaymentMethod("card")}
                    type="button"
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "card" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    >
                      {selectedPaymentMethod === "card" && (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-3 text-white"
                        />
                      )}
                    </div>
                    <CreditCardIcon
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                    <span className="font-medium">Card</span>
                  </button>

                  {selectedPaymentMethod === "card" && (
                    <div className="space-y-4 p-4">
                      <div className="space-y-2">
                        <Label className="font-medium text-sm">
                          Card information
                        </Label>
                        <div className="overflow-hidden rounded-md border">
                          <div className="relative">
                            <Input
                              className="rounded-none border-0 border-b pr-24"
                              disabled={loading}
                              maxLength={19}
                              onChange={(e) =>
                                setCardNumber(formatCardNumber(e.target.value))
                              }
                              placeholder="1234 1234 1234 1234"
                              required
                              type="text"
                              value={cardNumber}
                            />
                            <div className="-translate-y-1/2 absolute top-1/2 right-3 flex gap-1">
                              <VisaIcon className="size-6" />
                              <MastercardIcon className="size-6" />
                              <AmexIcon className="size-6" />
                            </div>
                          </div>
                          <div className="flex">
                            <Input
                              className="flex-1 rounded-none border-0 border-r"
                              disabled={loading}
                              maxLength={7}
                              onChange={(e) =>
                                setExpiry(formatExpiry(e.target.value))
                              }
                              placeholder="MM / YY"
                              required
                              type="text"
                              value={expiry}
                            />
                            <div className="relative flex-1">
                              <Input
                                className="rounded-none border-0 pr-10"
                                disabled={loading}
                                maxLength={4}
                                onChange={(e) =>
                                  setCvc(e.target.value.replace(/[^0-9]/g, ""))
                                }
                                placeholder="CVC"
                                required
                                type="text"
                                value={cvc}
                              />
                              <LockIcon
                                aria-hidden="true"
                                className="-translate-y-1/2 absolute top-1/2 right-3 size-4 text-muted-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={billingIsSameAsShipping}
                          name="billingIsSameAsShipping"
                          onCheckedChange={(checked) =>
                            setBillingIsSameAsShipping(checked === true)
                          }
                        />
                        <Label className="text-sm">
                          Billing info is same as shipping
                        </Label>
                      </div>
                    </div>
                  )}

                  <button
                    className={`flex w-full items-center gap-3 border-b p-4 text-left ${selectedPaymentMethod === "alipay" ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedPaymentMethod("alipay")}
                    type="button"
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "alipay" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    >
                      {selectedPaymentMethod === "alipay" && (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-3 text-white"
                        />
                      )}
                    </div>
                    <span className="font-medium">Alipay</span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 border-b p-4 text-left ${selectedPaymentMethod === "cashapp" ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedPaymentMethod("cashapp")}
                    type="button"
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "cashapp" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    >
                      {selectedPaymentMethod === "cashapp" && (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-3 text-white"
                        />
                      )}
                    </div>
                    <span className="font-medium">Cash App Pay</span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 p-4 text-left ${selectedPaymentMethod === "bank" ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedPaymentMethod("bank")}
                    type="button"
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "bank" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    >
                      {selectedPaymentMethod === "bank" && (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-3 text-white"
                        />
                      )}
                    </div>
                    <span className="font-medium">US bank account</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  checked={saveInfo}
                  name="saveInfo"
                  onCheckedChange={(checked) => setSaveInfo(checked === true)}
                />
                <div>
                  <Label className="text-sm">
                    Save my information for faster checkout
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Pay securely at Powdur and everywhere{" "}
                    <a className="text-primary hover:underline" href="#">
                      Link
                    </a>{" "}
                    is accepted.
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={loading}
                size="lg"
                type="submit"
              >
                {loading ? (
                  <>
                    <Spinner aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  "Pay"
                )}
              </Button>
            </div>
          </Form>

          <footer className="mt-8 flex items-center justify-between text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <span>Powered by</span>
              <StripeLogo className="h-4" />
            </div>
            <div className="flex gap-4">
              <button className="hover:text-foreground" type="button">
                Legal
              </button>
              <button className="hover:text-foreground" type="button">
                Returns
              </button>
              <button className="hover:text-foreground" type="button">
                Contact
              </button>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
