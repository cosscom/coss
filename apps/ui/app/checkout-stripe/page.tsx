"use client";

import {
  BuildingIcon,
  CheckIcon,
  CreditCardIcon,
  LockIcon,
  ShieldCheckIcon,
  TagIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/registry/default/ui/card";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field";
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
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "United Kingdom", value: "uk" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "Australia", value: "au" },
];

const orderItems = [
  {
    id: "pure-glow",
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

function GooglePayIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
        fill="#4285F4"
      />
    </svg>
  );
}

type PaymentMethod = "card" | "alipay" | "bank";

export default function StripeCheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("card");
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);

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
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
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

  const handleWalletPayment = async (wallet: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    alert(`${wallet} payment successful! Thank you for your purchase.`);
  };

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your order details</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="flex flex-col gap-4">
              {orderItems.map((item) => (
                <div
                  className="flex items-center justify-between"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-sm">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">${item.price.toFixed(2)}</p>
                </div>
              ))}

              <Separator />

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <TagIcon aria-hidden="true" className="size-3" />
                      {promoCode.code}
                    </Badge>
                  </div>
                  <span className="font-medium text-green-600">
                    -${discount.toFixed(2)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed p-3">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                />
                <div className="text-xs">
                  <p className="font-medium">Secure Checkout</p>
                  <p className="text-muted-foreground">
                    256-bit SSL encryption
                  </p>
                </div>
              </div>
            </div>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCardIcon aria-hidden="true" className="size-5" />
              <CardTitle>Payment</CardTitle>
            </div>
            <CardDescription>Complete your purchase securely</CardDescription>
          </CardHeader>
          <CardPanel>
            <Form onSubmit={onSubmit}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <Label className="font-semibold text-base">
                    Express Checkout
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      disabled={loading}
                      onClick={() => handleWalletPayment("Apple Pay")}
                      type="button"
                    >
                      <ApplePayIcon className="size-5" />
                      Apple Pay
                    </Button>
                    <Button
                      disabled={loading}
                      onClick={() => handleWalletPayment("Google Pay")}
                      type="button"
                      variant="outline"
                    >
                      <GooglePayIcon className="size-5" />
                      Google Pay
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-muted-foreground text-xs">
                    Or pay with card
                  </span>
                  <Separator className="flex-1" />
                </div>

                <div className="flex flex-col gap-4">
                  <Label className="font-semibold text-base">
                    Contact Information
                  </Label>
                  <Field name="email">
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      disabled={loading}
                      placeholder="john@example.com"
                      required
                      type="email"
                    />
                    <FieldError>Please enter a valid email.</FieldError>
                  </Field>
                </div>

                <Separator />

                <div className="flex flex-col gap-4">
                  <Label className="font-semibold text-base">
                    Shipping Address
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="firstName">
                      <FieldLabel>First Name</FieldLabel>
                      <Input
                        disabled={loading}
                        placeholder="John"
                        required
                        type="text"
                      />
                      <FieldError>Please enter your first name.</FieldError>
                    </Field>
                    <Field name="lastName">
                      <FieldLabel>Last Name</FieldLabel>
                      <Input
                        disabled={loading}
                        placeholder="Doe"
                        required
                        type="text"
                      />
                      <FieldError>Please enter your last name.</FieldError>
                    </Field>
                  </div>
                  <Field name="country">
                    <FieldLabel>Country</FieldLabel>
                    <Select defaultValue="us" items={countryOptions}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {countryOptions.map(({ label, value }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                  <Field name="address">
                    <FieldLabel>Address</FieldLabel>
                    <Input
                      disabled={loading}
                      placeholder="123 Main St"
                      required
                      type="text"
                    />
                    <FieldError>Please enter your address.</FieldError>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field name="city">
                      <FieldLabel>City</FieldLabel>
                      <Input
                        disabled={loading}
                        placeholder="San Francisco"
                        required
                        type="text"
                      />
                      <FieldError>Please enter your city.</FieldError>
                    </Field>
                    <Field name="state">
                      <FieldLabel>State</FieldLabel>
                      <Input
                        disabled={loading}
                        placeholder="CA"
                        required
                        type="text"
                      />
                      <FieldError>Please enter your state.</FieldError>
                    </Field>
                    <Field name="zip">
                      <FieldLabel>ZIP Code</FieldLabel>
                      <Input
                        disabled={loading}
                        placeholder="94102"
                        required
                        type="text"
                      />
                      <FieldError>Please enter your ZIP code.</FieldError>
                    </Field>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-4">
                  <Label className="font-semibold text-base">
                    Payment Method
                  </Label>

                  <div className="flex flex-col overflow-hidden rounded-lg border">
                    <button
                      className={`flex items-center gap-3 border-b p-4 text-left transition-colors ${selectedPaymentMethod === "card" ? "bg-muted/50" : "hover:bg-muted/30"}`}
                      onClick={() => setSelectedPaymentMethod("card")}
                      type="button"
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "card" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                      >
                        {selectedPaymentMethod === "card" && (
                          <CheckIcon
                            aria-hidden="true"
                            className="size-3 text-primary-foreground"
                          />
                        )}
                      </div>
                      <CreditCardIcon
                        aria-hidden="true"
                        className="size-5 text-muted-foreground"
                      />
                      <span className="font-medium">Credit or Debit Card</span>
                    </button>

                    {selectedPaymentMethod === "card" && (
                      <div className="flex flex-col gap-4 border-b bg-muted/20 p-4">
                        <Field name="cardNumber">
                          <FieldLabel>Card Number</FieldLabel>
                          <Input
                            disabled={loading}
                            maxLength={19}
                            onChange={(e) =>
                              setCardNumber(formatCardNumber(e.target.value))
                            }
                            placeholder="4242 4242 4242 4242"
                            required
                            type="text"
                            value={cardNumber}
                          />
                          <FieldError>
                            Please enter a valid card number.
                          </FieldError>
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field name="expiry">
                            <FieldLabel>Expiration Date</FieldLabel>
                            <Input
                              disabled={loading}
                              maxLength={5}
                              onChange={(e) =>
                                setExpiry(formatExpiry(e.target.value))
                              }
                              placeholder="MM/YY"
                              required
                              type="text"
                              value={expiry}
                            />
                            <FieldError>
                              Please enter a valid expiry date.
                            </FieldError>
                          </Field>
                          <Field name="cvc">
                            <FieldLabel>CVC</FieldLabel>
                            <Input
                              disabled={loading}
                              maxLength={4}
                              onChange={(e) =>
                                setCvc(e.target.value.replace(/[^0-9]/g, ""))
                              }
                              placeholder="123"
                              required
                              type="text"
                              value={cvc}
                            />
                            <FieldError>Please enter a valid CVC.</FieldError>
                          </Field>
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
                            Billing address same as shipping
                          </Label>
                        </div>
                      </div>
                    )}

                    <button
                      className={`flex items-center gap-3 border-b p-4 text-left transition-colors ${selectedPaymentMethod === "alipay" ? "bg-muted/50" : "hover:bg-muted/30"}`}
                      onClick={() => setSelectedPaymentMethod("alipay")}
                      type="button"
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "alipay" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                      >
                        {selectedPaymentMethod === "alipay" && (
                          <CheckIcon
                            aria-hidden="true"
                            className="size-3 text-primary-foreground"
                          />
                        )}
                      </div>
                      <span className="font-medium">Alipay</span>
                    </button>

                    <button
                      className={`flex items-center gap-3 p-4 text-left transition-colors ${selectedPaymentMethod === "bank" ? "bg-muted/50" : "hover:bg-muted/30"}`}
                      onClick={() => setSelectedPaymentMethod("bank")}
                      type="button"
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded-full border-2 ${selectedPaymentMethod === "bank" ? "border-primary bg-primary" : "border-muted-foreground"}`}
                      >
                        {selectedPaymentMethod === "bank" && (
                          <CheckIcon
                            aria-hidden="true"
                            className="size-3 text-primary-foreground"
                          />
                        )}
                      </div>
                      <BuildingIcon
                        aria-hidden="true"
                        className="size-5 text-muted-foreground"
                      />
                      <span className="font-medium">Bank Transfer</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
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
                      <>
                        <LockIcon aria-hidden="true" />
                        Pay ${total.toFixed(2)}
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                    <ShieldCheckIcon aria-hidden="true" className="size-4" />
                    <span>
                      Secured by Stripe. Your payment info is encrypted.
                    </span>
                  </div>
                </div>
              </div>
            </Form>
          </CardPanel>
        </Card>
      </div>
    </main>
  );
}
