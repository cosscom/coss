import type { Meta, StoryObj } from "@storybook/react";
import ThemeToggle from "@/components/theme-toggle";

const meta = {
  title: "UI/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
