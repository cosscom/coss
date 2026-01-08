import Card1 from "@/registry/default/particles/p-card-1";
import Table1 from "@/registry/default/particles/p-table-1";
import Table3 from "@/registry/default/particles/p-table-3";
import { Button } from "@/registry/default/ui/button";
import { Input } from "@/registry/default/ui/input";

export default function Page() {
  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="flex flex-col items-start gap-12 p-12">
        <div>
          <Input />
        </div>
        <Button variant="outline">Click me</Button>
        <Card1 />
        <Table1 />
        <Table3 />
      </div>
    </main>
  );
}
