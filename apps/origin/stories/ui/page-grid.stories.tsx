import type { Meta, StoryObj } from "@storybook/react";
import PageGrid from "@/components/page-grid";

const meta = {
  title: "UI/PageGrid",
  component: PageGrid,
} satisfies Meta<typeof PageGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
