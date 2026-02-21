import type { Meta, StoryObj } from "@storybook/react";
import ComponentCard from "@/components/component-card";

const meta = {
  title: "UI/ComponentCard",
  component: ComponentCard,
} satisfies Meta<typeof ComponentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
