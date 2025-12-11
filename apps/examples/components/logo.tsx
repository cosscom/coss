import Link from "next/link";

export function Logo({ ...props }) {
  return (
    <Link href="/" {...props}>
      <h1 className="font-heading text-foreground text-lg leading-none md:max-lg:text-[0.9375rem]">
        Cal<span className="md:max-lg:sr-only">.com</span>
      </h1>
    </Link>
  );
}
