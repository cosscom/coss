import { Button } from "@/registry/default/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/registry/default/ui/card";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Form } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";
import { Separator } from "@/registry/default/ui/separator";

export default function Particle() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>
          <h1 className="font-bold text-2xl">Welcome back</h1>
        </CardTitle>
        <CardDescription>
          <p>Sign in to your account to continue.</p>
        </CardDescription>
      </CardHeader>
      <CardPanel>
        <Form className="flex w-full flex-col gap-4">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input placeholder="Enter your email" type="email" />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input placeholder="Enter your password" type="password" />
          </Field>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </Form>
        <div className="my-3 flex items-center justify-center gap-3 overflow-x-auto">
          <Separator />
          <span className="text-muted-foreground text-sm">or</span>
          <Separator />
        </div>
        <Button className="w-full" variant="outline">
          Sign up
        </Button>
      </CardPanel>
    </Card>
  );
}
