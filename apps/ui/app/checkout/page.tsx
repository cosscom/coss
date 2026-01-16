"use client";

import { CreditCardIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
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

const countryOptions = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "United Kingdom", value: "uk" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "Australia", value: "au" },
];

const orderItems = [
  { id: "pro-plan", name: "Pro Plan (Annual)", price: 199.0, quantity: 1 },
  { id: "seats", name: "Additional Seats (5)", price: 49.0, quantity: 1 },
];

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    alert("Payment successful! Thank you for your purchase.");
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
              Enter your payment information to complete your purchase
            </CardDescription>
          </CardHeader>
          <Form onSubmit={onSubmit}>
            <CardPanel>
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
                    <FieldError>Please enter a valid card number.</FieldError>
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
                      <FieldError>Please enter a valid expiry date.</FieldError>
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
            </CardPanel>
            <CardFooter className="flex-col gap-4">
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
                <span>Secured by Stripe. Your payment info is encrypted.</span>
              </div>
            </CardFooter>
          </Form>
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
