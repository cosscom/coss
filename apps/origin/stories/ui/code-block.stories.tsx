import type { Meta, StoryObj } from "@storybook/react";
import CodeBlock from "@/components/code-block";

const meta = {
  title: "UI/CodeBlock",
  component: CodeBlock,
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: 'console.log("Hello, world!");',
    lang: "typescript",
  },
};
