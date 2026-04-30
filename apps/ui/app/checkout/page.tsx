"use client";

import {
  BanknoteIcon,
  CreditCardIcon,
  LockIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";

const countryOptions = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "United Kingdom", value: "uk" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "Australia", value: "au" },
];

const sepaCountryOptions = [
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "Netherlands", value: "nl" },
  { label: "Belgium", value: "be" },
  { label: "Austria", value: "at" },
  { label: "Spain", value: "es" },
  { label: "Italy", value: "it" },
];

const orderItems = [
  { id: "pro-plan", name: "Pro Plan (Annual)", price: 199.0, quantity: 1 },
  { id: "seats", name: "Additional Seats (5)", price: 49.0, quantity: 1 },
];

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

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [iban, setIban] = useState("");

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

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

  const formatIban = (value: string) => {
    const v = value.replace(/\s+/g, "").toUpperCase();
    const parts = [];
    for (let i = 0, len = v.length; i < len; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(" ");
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
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCardIcon aria-hidden="true" className="size-5" />
              <CardTitle>Payment Details</CardTitle>
            </div>
            <CardDescription>
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <Tabs defaultValue="card">
              <TabsList className="w-full">
                <TabsTab className="flex-1" value="card">
                  <CreditCardIcon aria-hidden="true" className="size-4" />
                  Card
                </TabsTab>
                <TabsTab className="flex-1" value="wallet">
                  <SmartphoneIcon aria-hidden="true" className="size-4" />
                  Wallet
                </TabsTab>
                <TabsTab className="flex-1" value="sepa">
                  <BanknoteIcon aria-hidden="true" className="size-4" />
                  SEPA
                </TabsTab>
              </TabsList>

              <TabsPanel className="mt-6" value="card">
                <Form onSubmit={onSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <Label className="font-semibold text-base">
                        Contact Information
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
                        Card Information
                      </Label>
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
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-4">
                      <Label className="font-semibold text-base">
                        Billing Address
                      </Label>
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
                        <FieldLabel>Street Address</FieldLabel>
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
                  </div>
                  <div className="mt-6 flex flex-col gap-4">
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
                </Form>
              </TabsPanel>

              <TabsPanel className="mt-6" value="wallet">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <Label className="font-semibold text-base">
                      Express Checkout
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Pay quickly and securely with your preferred digital
                      wallet.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      disabled={loading}
                      onClick={() => handleWalletPayment("Apple Pay")}
                      size="lg"
                      type="button"
                    >
                      {loading ? (
                        <>
                          <Spinner aria-hidden="true" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ApplePayIcon className="size-5" />
                          Pay with Apple Pay
                        </>
                      )}
                    </Button>

                    <Button
                      className="w-full"
                      disabled={loading}
                      onClick={() => handleWalletPayment("Google Pay")}
                      size="lg"
                      type="button"
                      variant="outline"
                    >
                      {loading ? (
                        <>
                          <Spinner aria-hidden="true" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <GooglePayIcon className="size-5" />
                          Pay with Google Pay
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  <div className="rounded-lg border border-dashed p-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <SmartphoneIcon
                        aria-hidden="true"
                        className="size-8 text-muted-foreground"
                      />
                      <p className="font-medium text-sm">
                        Digital Wallet Payment
                      </p>
                      <p className="text-muted-foreground text-xs">
                        When you click a wallet button, you&apos;ll be prompted
                        to authenticate with your device (Face ID, Touch ID, or
                        fingerprint).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                    <ShieldCheckIcon aria-hidden="true" className="size-4" />
                    <span>
                      Secured by Stripe. Your payment info is encrypted.
                    </span>
                  </div>
                </div>
              </TabsPanel>

              <TabsPanel className="mt-6" value="sepa">
                <Form onSubmit={onSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <Label className="font-semibold text-base">
                        SEPA Direct Debit
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Pay directly from your European bank account. Available
                        for customers in the Single Euro Payments Area.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <Label className="font-semibold text-base">
                        Account Holder
                      </Label>
                      <Field name="accountHolder">
                        <FieldLabel>Full Name</FieldLabel>
                        <Input
                          disabled={loading}
                          placeholder="Max Mustermann"
                          required
                          type="text"
                        />
                        <FieldError>
                          Please enter the account holder name.
                        </FieldError>
                      </Field>
                      <Field name="sepaEmail">
                        <FieldLabel>Email</FieldLabel>
                        <Input
                          disabled={loading}
                          placeholder="max@example.de"
                          required
                          type="email"
                        />
                        <FieldError>Please enter a valid email.</FieldError>
                      </Field>
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-4">
                      <Label className="font-semibold text-base">
                        Bank Account Details
                      </Label>
                      <Field name="iban">
                        <FieldLabel>IBAN</FieldLabel>
                        <Input
                          disabled={loading}
                          maxLength={34}
                          onChange={(e) => setIban(formatIban(e.target.value))}
                          placeholder="DE89 3704 0044 0532 0130 00"
                          required
                          type="text"
                          value={iban}
                        />
                        <FieldError>Please enter a valid IBAN.</FieldError>
                      </Field>
                      <Field name="sepaCountry">
                        <FieldLabel>Country</FieldLabel>
                        <Select defaultValue="de" items={sepaCountryOptions}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {sepaCountryOptions.map(({ label, value }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </Field>
                    </div>

                    <div className="rounded-lg border border-dashed bg-muted/50 p-4">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        By providing your IBAN and confirming this payment, you
                        authorize (A) this company and Stripe, our payment
                        service provider, to send instructions to your bank to
                        debit your account and (B) your bank to debit your
                        account in accordance with those instructions. You are
                        entitled to a refund from your bank under the terms and
                        conditions of your agreement with your bank.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-4">
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
                          <BanknoteIcon aria-hidden="true" />
                          Pay ${total.toFixed(2)} via SEPA
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
                </Form>
              </TabsPanel>
            </Tabs>
          </CardPanel>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardPanel>
              <div className="flex flex-col gap-4">
                {orderItems.map((item) => (
                  <div
                    className="flex items-start justify-between"
                    key={item.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    <span className="font-medium text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Subtotal
                  </span>
                  <span className="text-sm">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Tax (10%)
                  </span>
                  <span className="text-sm">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardPanel>
          </Card>

          <Card className="bg-muted/50">
            <CardPanel className="py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <ShieldCheckIcon aria-hidden="true" className="size-3" />
                    Secure
                  </Badge>
                  <span className="font-medium text-sm">
                    256-bit SSL Encryption
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your payment information is processed securely. We do not
                  store credit card details nor have access to your credit card
                  information.
                </p>
              </div>
            </CardPanel>
          </Card>
        </div>
      </div>
    </main>
  );
}
