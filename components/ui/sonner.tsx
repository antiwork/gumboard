"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "next-themes";

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return <Sonner theme={theme as ToasterProps["theme"]} {...props} />;
};

export default Toaster;
