import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "@/components/theme-provider";

const meta = {
  title: "UI/ThemeProvider",
  component: ThemeProvider,
} satisfies Meta<typeof ThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ThemeProvider data-config-id="theme-provider-default">Click me</ThemeProvider>,
};
