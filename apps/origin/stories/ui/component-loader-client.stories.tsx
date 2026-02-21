import type { Meta, StoryObj } from "@storybook/react";
import ComponentLoader from "@/components/component-loader-client";

const meta = {
  title: "UI/ComponentLoaderClient",
  component: ComponentLoader,
} satisfies Meta<typeof ComponentLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
